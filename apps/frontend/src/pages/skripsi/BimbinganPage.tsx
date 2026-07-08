import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import {
  completeBimbingan,
  confirmBimbingan,
  getBimbinganBySkripsi,
  rejectBimbingan,
  requestBimbingan,
} from "../../services/bimbingan";
import { getBimbinganCounter } from "../../services/skripsi";
import {
  getWorkflowSkripsiList,
  submitWorkflowAction,
  type WorkflowAction,
  type WorkflowItem,
  type WorkflowPembimbing,
  type WorkflowStage
} from "../../services/workflow";
import type { BimbinganLog } from "../../types/bimbingan";
import DetailPanel from "../../components/ui/DetailPanel";
import StatusBadge from "../../components/ui/StatusBadge";
import { getApiErrorMessage } from "../../utils/apiError";

function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getBimbinganStage(workflow?: WorkflowItem | null) {
  return workflow?.stages?.find((stage) => stage.key === "BIMBINGAN") ?? null;
}

function getPembimbingOptions(stage?: WorkflowStage | null) {
  return (stage?.pembimbing ?? []).filter(
    (item) => item.peran === "PEMBIMBING" && item.isActive && item.dosen
  );
}

function getWorkflowDisplayStatus(workflow: WorkflowItem) {
  const bimbinganStage = getBimbinganStage(workflow);

  return bimbinganStage?.status || workflow.summaryStatus || workflow.skripsi.status || "-";
}

function shouldShowInBimbingan(workflow: WorkflowItem) {
  const stage = getBimbinganStage(workflow);
  const status = String(workflow.skripsi.status || "");
  const tahap = String(workflow.skripsi.tahap || "");

  if (stage && stage.status !== "BELUM_MULAI") return true;
  if ((stage?.pembimbing ?? []).length > 0) return true;

  return [
    "MENUNGGU_PEMBIMBING",
    "BIMBINGAN",
    "MENUNGGU_SEMINAR_HASIL",
    "SEMINAR_HASIL",
    "MENUNGGU_KOMPRE",
    "SIDANG_KOMPRE",
    "MENUNGGU_SIDANG_AKHIR",
    "SIDANG_AKHIR",
    "LULUS_SKRIPSI",
    "TIDAK_LULUS_SKRIPSI"
  ].includes(status) || ["KOMPRE", "SIDANG_SKRIPSI", "FINAL"].includes(tahap);
}

function getApproveAction(workflow?: WorkflowItem | null) {
  return (
    workflow?.actions?.find((action) => action.key === "APPROVE_MAJU_SEMHAS") ??
    null
  );
}

function isActivePembimbingForUser(
  pembimbingOptions: WorkflowPembimbing[],
  userId?: string
) {
  if (!userId) return false;

  return pembimbingOptions.some((item) => item.dosenId === userId);
}

export default function BimbinganPage() {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const isMahasiswa = hasRole("mahasiswa");
  const isDosenPembimbing = hasRole("dosen_pembimbing");
  const isDosenKoordinator = hasRole("dosen_koordinator");
  const isKetuaProdi = hasRole("ketua_prodi");
  const isAdmin = hasRole("admin");
  const isStaf = hasRole("staf_prodi");

  const canMonitorBimbingan =
    isAdmin || isDosenKoordinator || isKetuaProdi || isStaf;

  const [selectedSkripsiId, setSelectedSkripsiId] = useState("");
  const [requestForm, setRequestForm] = useState({
    dosenId: "",
    jadwalMulai: "",
    jadwalSelesai: "",
    topik: ""
  });

  const [actionDialogLog, setActionDialogLog] = useState<BimbinganLog | null>(null);
  const [actionDialogMode, setActionDialogMode] = useState<"confirm" | "reject" | "complete" | null>(null);
  const [actionForm, setActionForm] = useState({
    hasil: "",
    catatanDosen: ""
  });

  const workflowQuery = useQuery({
    queryKey: ["workflow-skripsi-list-for-bimbingan"],
    queryFn: () =>
      getWorkflowSkripsiList({
        limit: 100
      })
  });

  const workflowRows = workflowQuery.data?.data ?? [];

  const workflowOptions = useMemo(() => {
    const filtered = workflowRows.filter(shouldShowInBimbingan);

    if (filtered.length > 0) {
      return filtered;
    }

    return workflowRows;
  }, [workflowRows]);

  useEffect(() => {
    if (!selectedSkripsiId && workflowOptions.length > 0) {
      setSelectedSkripsiId(workflowOptions[0].skripsi.id);
    }

    if (
      selectedSkripsiId &&
      workflowOptions.length > 0 &&
      !workflowOptions.some((item) => item.skripsi.id === selectedSkripsiId)
    ) {
      setSelectedSkripsiId(workflowOptions[0].skripsi.id);
    }
  }, [selectedSkripsiId, workflowOptions]);

  const selectedWorkflow = workflowOptions.find(
    (item) => item.skripsi.id === selectedSkripsiId
  );

  const selectedSkripsi = selectedWorkflow?.skripsi ?? null;
  const bimbinganStage = getBimbinganStage(selectedWorkflow);
  const pembimbingOptions = getPembimbingOptions(bimbinganStage);
  const approveAction = getApproveAction(selectedWorkflow);

  const bimbinganQuery = useQuery({
    queryKey: ["bimbingan", selectedSkripsiId],
    queryFn: () => getBimbinganBySkripsi(selectedSkripsiId),
    enabled: Boolean(selectedSkripsiId)
  });

  const counterQuery = useQuery({
    queryKey: ["bimbingan-counter", selectedSkripsiId],
    queryFn: () => getBimbinganCounter(selectedSkripsiId),
    enabled: Boolean(selectedSkripsiId)
  });

  const requestMutation = useMutation({
    mutationFn: () =>
      requestBimbingan(selectedSkripsiId, {
        dosenId: requestForm.dosenId,
        jadwalMulai: toIsoDateTime(requestForm.jadwalMulai),
        jadwalSelesai: toIsoDateTime(requestForm.jadwalSelesai),
        topik: requestForm.topik
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bimbingan"] }),
        queryClient.invalidateQueries({ queryKey: ["bimbingan-counter"] }),
        queryClient.invalidateQueries({ queryKey: ["workflow-skripsi-list-for-bimbingan"] }),
        queryClient.invalidateQueries({ queryKey: ["workflow-skripsi"] })
      ]);

      setRequestForm({
        dosenId: "",
        jadwalMulai: "",
        jadwalSelesai: "",
        topik: ""
      });
    },
    onError: (error) => {
      alert(getApiErrorMessage(error, "Gagal mengajukan bimbingan."));
    }
  });

  const confirmMutation = useMutation({
    mutationFn: ({
      id,
      catatanDosen
    }: {
      id: string;
      catatanDosen?: string;
    }) =>
      confirmBimbingan(id, {
        catatanDosen
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bimbingan"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-skripsi-list-for-bimbingan"] });
    },
    onError: (error) => {
      alert(getApiErrorMessage(error, "Gagal menyetujui bimbingan."));
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({
      id,
      catatanDosen
    }: {
      id: string;
      catatanDosen?: string;
    }) =>
      rejectBimbingan(id, {
        catatanDosen
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bimbingan"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-skripsi-list-for-bimbingan"] });
    },
    onError: (error) => {
      alert(getApiErrorMessage(error, "Gagal menolak bimbingan."));
    }
  });

  const completeMutation = useMutation({
    mutationFn: ({
      id,
      hasil,
      catatanDosen
    }: {
      id: string;
      hasil: string;
      catatanDosen?: string;
    }) =>
      completeBimbingan(id, {
        hasil,
        catatanDosen
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bimbingan"] });
      queryClient.invalidateQueries({ queryKey: ["workflow-skripsi-list-for-bimbingan"] });
      setActionDialogMode(null);
      setActionDialogLog(null);
    },
    onError: (error) => {
      alert(getApiErrorMessage(error, "Gagal mengisi hasil bimbingan."));
    }
  });

  const approveSemhasMutation = useMutation({
    mutationFn: (action: WorkflowAction) => submitWorkflowAction(action, {}),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bimbingan"] }),
        queryClient.invalidateQueries({ queryKey: ["bimbingan-counter"] }),
        queryClient.invalidateQueries({ queryKey: ["workflow-skripsi-list-for-bimbingan"] }),
        queryClient.invalidateQueries({ queryKey: ["workflow-skripsi"] })
      ]);

      alert("Mahasiswa berhasil disetujui maju Seminar Hasil.");
    },
    onError: (error) => {
      alert(getApiErrorMessage(error, "Gagal approve maju Seminar Hasil."));
    }
  });

  const logs: BimbinganLog[] = bimbinganQuery.data?.data ?? [];

  const validCount =
    bimbinganStage?.progress?.validCount ??
    counterQuery.data?.validCount ??
    bimbinganQuery.data?.meta?.validCount ??
    0;

  const requiredCount =
    bimbinganStage?.progress?.requiredCount ??
    counterQuery.data?.requiredCount ??
    bimbinganQuery.data?.meta?.requiredCount ??
    8;

  const totalCount =
    bimbinganStage?.progress?.totalCount ??
    logs.length;

  const canRequestSemhas =
    bimbinganStage?.progress
      ? validCount >= requiredCount
      : counterQuery.data?.canRequestSidang ??
      bimbinganQuery.data?.meta?.canRequestSidang ??
      validCount >= requiredCount;

  const percentage = Math.min(
    Math.round((validCount / Math.max(requiredCount, 1)) * 100),
    100
  );

  const isPembimbingAktifUntukSkripsi = isActivePembimbingForUser(
    pembimbingOptions,
    user?.id
  );

  const canMahasiswaRequest =
    isMahasiswa &&
    selectedSkripsi &&
    pembimbingOptions.length > 0 &&
    !["LULUS_SKRIPSI", "TIDAK_LULUS_SKRIPSI", "SELESAI"].includes(
      String(selectedSkripsi.status || "")
    );

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestMutation.mutate();
  }

  function handleActionSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!actionDialogLog || !actionDialogMode) return;

    if (actionDialogMode === "confirm") {
      confirmMutation.mutate({
        id: actionDialogLog.id,
        catatanDosen: actionForm.catatanDosen
      });
    } else if (actionDialogMode === "reject") {
      rejectMutation.mutate({
        id: actionDialogLog.id,
        catatanDosen: actionForm.catatanDosen
      });
    } else if (actionDialogMode === "complete") {
      completeMutation.mutate({
        id: actionDialogLog.id,
        hasil: actionForm.hasil,
        catatanDosen: actionForm.catatanDosen
      });
    }
  }

  function openActionDialog(log: BimbinganLog, mode: "confirm" | "reject" | "complete") {
    setActionDialogLog(log);
    setActionDialogMode(mode);
    setActionForm({
      hasil: "",
      catatanDosen: ""
    });
  }

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Bimbingan</p>
        <h1>Bimbingan Skripsi</h1>
        <p className="muted">
          Data bimbingan sekarang mengikuti Workflow Sidang, sehingga mahasiswa,
          pembimbing, koordinator, kaprodi, admin, dan staf melihat data sesuai
          role masing-masing.
        </p>
      </div>

      {workflowQuery.isError ? (
        <div className="alert-error">
          {getApiErrorMessage(
            workflowQuery.error,
            "Gagal memuat data workflow bimbingan."
          )}
        </div>
      ) : null}

      <section className="card form-stack">
        <label>
          <span>Pilih Skripsi</span>
          <select
            value={selectedSkripsiId}
            onChange={(event) => setSelectedSkripsiId(event.target.value)}
          >
            {workflowOptions.length === 0 ? (
              <option value="">Belum ada skripsi bimbingan</option>
            ) : (
              workflowOptions.map((workflow) => (
                <option key={workflow.skripsi.id} value={workflow.skripsi.id}>
                  {workflow.skripsi.mahasiswa?.identifier || "-"} •{" "}
                  {workflow.skripsi.mahasiswa?.name || "-"} —{" "}
                  {workflow.skripsi.title || "Tanpa judul"}
                </option>
              ))
            )}
          </select>
        </label>

        {workflowQuery.isLoading ? (
          <p>Memuat data workflow...</p>
        ) : null}

        {selectedWorkflow && selectedSkripsi ? (
          <div className="progress-card">
            <div className="page-header-row">
              <div>
                <strong>{selectedSkripsi.title || "Tanpa judul"}</strong>
                <p className="muted">
                  {selectedSkripsi.mahasiswa?.identifier || "-"} •{" "}
                  {selectedSkripsi.mahasiswa?.name || "-"}
                </p>
                <p className="muted">
                  Tahap: {selectedSkripsi.tahap || "-"} • Status:{" "}
                  {selectedSkripsi.status || "-"} • Workflow:{" "}
                  {getWorkflowDisplayStatus(selectedWorkflow)}
                </p>
              </div>

              <div className="row-inline">
                <StatusBadge value={getWorkflowDisplayStatus(selectedWorkflow)} />
                <strong>
                  {validCount}/{requiredCount}
                </strong>
              </div>
            </div>

            <div className="progress-bar">
              <span style={{ width: `${percentage}%` }} />
            </div>

            <div className="mini-grid">
              <span>Total log: {totalCount}</span>
              <span>Valid: {validCount}</span>
              <span>Syarat: {requiredCount}</span>
              <span>Progress: {percentage}%</span>
              <span>
                Seminar Hasil: {canRequestSemhas ? "Siap" : "Belum siap"}
              </span>
              <span>Pembimbing: {pembimbingOptions.length}</span>
            </div>

            {pembimbingOptions.length > 0 ? (
              <div className="state-card">
                <strong>Pembimbing aktif</strong>
                <div className="mini-grid">
                  {pembimbingOptions.map((item) => (
                    <span key={item.id}>
                      {item.dosen?.identifier || "-"} • {item.dosen?.name || "-"}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="alert-error">
                Dosen pembimbing belum ditentukan. Koordinator/Kaprodi perlu
                assign pembimbing terlebih dahulu.
              </div>
            )}

            {canRequestSemhas ? (
              approveAction ? (
                <button
                  type="button"
                  className="primary-button"
                  disabled={approveSemhasMutation.isPending}
                  onClick={() => approveSemhasMutation.mutate(approveAction)}
                >
                  {approveSemhasMutation.isPending
                    ? "Memproses..."
                    : "Approve Maju Seminar Hasil"}
                </button>
              ) : (
                <div className="state-card success">
                  Syarat bimbingan sudah cukup. Tombol approve hanya tampil untuk
                  dosen pembimbing aktif yang berwenang.
                </div>
              )
            ) : (
              <div className="state-card">
                Butuh {Math.max(requiredCount - validCount, 0)} bimbingan valid
                lagi sebelum maju Seminar Hasil.
              </div>
            )}
          </div>
        ) : (
          <div className="state-card">
            Belum ada skripsi yang masuk tahap bimbingan untuk role Anda.
          </div>
        )}
      </section>

      {canMahasiswaRequest ? (
        <form className="card form-stack" onSubmit={handleRequestSubmit}>
          <h2>Ajukan Bimbingan</h2>

          <label>
            <span>Dosen Pembimbing</span>
            <select
              value={requestForm.dosenId}
              onChange={(event) =>
                setRequestForm((current) => ({
                  ...current,
                  dosenId: event.target.value
                }))
              }
              required
            >
              <option value="">Pilih dosen pembimbing</option>
              {pembimbingOptions.map((item) => (
                <option key={item.dosenId} value={item.dosenId}>
                  {item.dosen?.name || item.dosenId}
                </option>
              ))}
            </select>
          </label>

          <section className="two-column compact">
            <label>
              <span>Jadwal Mulai</span>
              <input
                type="datetime-local"
                value={requestForm.jadwalMulai}
                onChange={(event) =>
                  setRequestForm((current) => ({
                    ...current,
                    jadwalMulai: event.target.value
                  }))
                }
                required
              />
            </label>

            <label>
              <span>Jadwal Selesai</span>
              <input
                type="datetime-local"
                value={requestForm.jadwalSelesai}
                onChange={(event) =>
                  setRequestForm((current) => ({
                    ...current,
                    jadwalSelesai: event.target.value
                  }))
                }
                required
              />
            </label>
          </section>

          <label>
            <span>Topik Bimbingan</span>
            <textarea
              value={requestForm.topik}
              onChange={(event) =>
                setRequestForm((current) => ({
                  ...current,
                  topik: event.target.value
                }))
              }
              placeholder="Contoh: Diskusi Bab 1 dan rumusan masalah"
              required
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={
              requestMutation.isPending ||
              !selectedSkripsiId ||
              pembimbingOptions.length === 0
            }
          >
            {requestMutation.isPending ? "Mengajukan..." : "Ajukan Bimbingan"}
          </button>
        </form>
      ) : null}

      <section className="list-card">
        <div className="page-header-row">
          <div>
            <h2>Riwayat Bimbingan</h2>
            <p className="muted">
              Mahasiswa mengajukan, pembimbing menyetujui dan mengisi hasil,
              lalu mahasiswa memvalidasi agar masuk counter.
            </p>
          </div>

          {canMonitorBimbingan ? (
            <StatusBadge value="MONITORING" size="sm" />
          ) : null}
        </div>

        {bimbinganQuery.isError ? (
          <div className="alert-error">
            {getApiErrorMessage(
              bimbinganQuery.error,
              "Gagal memuat riwayat bimbingan."
            )}
          </div>
        ) : bimbinganQuery.isLoading ? (
          <p>Memuat bimbingan...</p>
        ) : logs.length === 0 ? (
          <p>Belum ada riwayat bimbingan.</p>
        ) : (
          logs.map((log) => (
            <article key={log.id} className="academic-card">
              <div className="page-header-row">
                <div>
                  <strong>{log.topik}</strong>
                  <p className="muted">
                    {formatDateTime(log.jadwalMulai)} -{" "}
                    {formatDateTime(log.jadwalSelesai)}
                  </p>
                  <small>
                    Mahasiswa: {log.mahasiswa?.name || "-"} • Dosen:{" "}
                    {log.dosen?.name || "-"}
                  </small>
                </div>

                <StatusBadge value={log.status} size="sm" />
              </div>

              <div className="mini-grid">
                <span>Hasil: {log.hasil || "-"}</span>
                <span>Catatan dosen: {log.catatanDosen || "-"}</span>
                <span>Catatan mahasiswa: {log.catatanMahasiswa || "-"}</span>
              </div>

              <div className="row-inline">
                {isDosenPembimbing &&
                  isPembimbingAktifUntukSkripsi &&
                  log.status === "DIAJUKAN" ? (
                  <>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => openActionDialog(log, "confirm")}
                    >
                      Setujui
                    </button>
                    <button
                      className="secondary-button"
                      type="button"
                      onClick={() => openActionDialog(log, "reject")}
                    >
                      Tolak
                    </button>
                  </>
                ) : null}

                {isDosenPembimbing &&
                  isPembimbingAktifUntukSkripsi &&
                  log.status === "DISETUJUI" ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => openActionDialog(log, "complete")}
                  >
                    Isi Hasil Bimbingan
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>

      <DetailPanel
        open={Boolean(actionDialogMode && actionDialogLog)}
        title={
          actionDialogMode === "confirm"
            ? "Setujui Bimbingan"
            : actionDialogMode === "reject"
              ? "Tolak Bimbingan"
              : "Isi Hasil Bimbingan"
        }
        subtitle={`Topik: ${actionDialogLog?.topik || "-"}`}
        onClose={() => {
          setActionDialogMode(null);
          setActionDialogLog(null);
        }}
        width="md"
      >
        <form className="form-stack" onSubmit={handleActionSubmit}>
          {actionDialogMode === "complete" ? (
            <label className="form-field">
              <span>Hasil Bimbingan</span>
              <textarea
                value={actionForm.hasil}
                onChange={(e) =>
                  setActionForm((current) => ({
                    ...current,
                    hasil: e.target.value
                  }))
                }
                placeholder="Deskripsikan hasil atau kesimpulan bimbingan..."
                required
                rows={4}
              />
            </label>
          ) : null}

          <label className="form-field">
            <span>
              Catatan Dosen{" "}
              {actionDialogMode !== "reject" && <small>(Opsional)</small>}
            </span>
            <textarea
              value={actionForm.catatanDosen}
              onChange={(e) =>
                setActionForm((current) => ({
                  ...current,
                  catatanDosen: e.target.value
                }))
              }
              placeholder={
                actionDialogMode === "reject"
                  ? "Alasan penolakan pengajuan bimbingan..."
                  : "Catatan tambahan untuk mahasiswa..."
              }
              required={actionDialogMode === "reject"}
              rows={3}
            />
          </label>

          <button
            type="submit"
            className="primary-button"
            disabled={
              confirmMutation.isPending ||
              rejectMutation.isPending ||
              completeMutation.isPending
            }
          >
            {confirmMutation.isPending ||
              rejectMutation.isPending ||
              completeMutation.isPending
              ? "Menyimpan..."
              : "Simpan"}
          </button>
        </form>
      </DetailPanel>
    </section>
  );
}
