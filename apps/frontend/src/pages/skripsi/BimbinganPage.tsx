import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { api } from "../../services/api";
import {
  completeBimbingan,
  confirmBimbingan,
  getBimbinganBySkripsi,
  rejectBimbingan,
  requestBimbingan,
  validateBimbingan
} from "../../services/bimbingan";
import {
  approveMajuSidang,
  getBimbinganCounter,
  getMySkripsi,
  getSkripsiList
} from "../../services/skripsi";
import type { BimbinganLog } from "../../types/bimbingan";
import type { SkripsiSummary } from "../../types/skripsi";
import { getApiErrorMessage } from "../../utils/apiError";

type DashboardAssignment = {
  skripsi: SkripsiSummary;
};

type DrawerMode = "request" | "detail" | null;

const emptyRequestForm = {
  dosenId: "",
  jadwalMulai: "",
  jadwalSelesai: "",
  topik: ""
};

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

function getLogSchedule(log: BimbinganLog) {
  return `${formatDateTime(log.jadwalMulai)} - ${formatDateTime(
    log.jadwalSelesai
  )}`;
}

export default function BimbinganPage() {
  const { user, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const isMahasiswa = hasRole("mahasiswa");
  const isDosen = hasRole([
    "dosen_pembimbing",
    "dosen_penguji",
    "dosen_koordinator"
  ]);

  const canManageBimbingan = hasRole([
    "admin",
    "dosen_koordinator",
    "ketua_prodi",
    "staf_prodi"
  ]);

  const [selectedSkripsiId, setSelectedSkripsiId] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedLog, setSelectedLog] = useState<BimbinganLog | null>(null);

  const [requestForm, setRequestForm] = useState(emptyRequestForm);
  const [catatanDosen, setCatatanDosen] = useState("");
  const [hasilBimbingan, setHasilBimbingan] = useState("");
  const [catatanMahasiswa, setCatatanMahasiswa] = useState("");

  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const mySkripsiQuery = useQuery({
    queryKey: ["my-skripsi"],
    queryFn: getMySkripsi
  });

  const managedSkripsiQuery = useQuery({
    queryKey: ["managed-skripsi-for-bimbingan"],
    queryFn: () =>
      getSkripsiList({
        limit: 100
      }),
    enabled: canManageBimbingan
  });

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-summary-for-bimbingan"],
    queryFn: async () => {
      const response = await api.get("/dashboard/my-summary");
      return response.data.data;
    }
  });

  const dosenAssignments: DashboardAssignment[] =
    dashboardQuery.data?.assignments ?? [];

  const skripsiOptions: SkripsiSummary[] = useMemo(() => {
    if (isMahasiswa) {
      return mySkripsiQuery.data ?? [];
    }

    if (canManageBimbingan) {
      return (managedSkripsiQuery.data?.data ?? []).filter((item) =>
        ["KOMPRE", "SIDANG_SKRIPSI"].includes(item.tahap || "")
      ) as SkripsiSummary[];
    }

    if (isDosen) {
      return dosenAssignments.map((item) => item.skripsi);
    }

    return [];
  }, [
    isMahasiswa,
    isDosen,
    canManageBimbingan,
    mySkripsiQuery.data,
    managedSkripsiQuery.data,
    dosenAssignments
  ]);

  useEffect(() => {
    if (!selectedSkripsiId && skripsiOptions.length > 0) {
      setSelectedSkripsiId(skripsiOptions[0].id);
    }
  }, [selectedSkripsiId, skripsiOptions]);

  const selectedSkripsi = skripsiOptions.find(
    (item) => item.id === selectedSkripsiId
  );

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

  const logs: BimbinganLog[] = bimbinganQuery.data?.data ?? [];

  const validCount =
    counterQuery.data?.validCount ?? bimbinganQuery.data?.meta?.validCount ?? 0;

  const requiredCount =
    counterQuery.data?.requiredCount ??
    bimbinganQuery.data?.meta?.requiredCount ??
    8;

  const canRequestSidang =
    counterQuery.data?.canRequestSidang ??
    bimbinganQuery.data?.meta?.canRequestSidang ??
    validCount >= requiredCount;

  const percentage = Math.min(
    Math.round((validCount / requiredCount) * 100),
    100
  );

  const pembimbingOptions =
    selectedSkripsi?.dosenSkripsi?.filter(
      (item) => item.peran === "PEMBIMBING" && item.isActive
    ) ?? [];

  const isSelectedFromDosenAssignments = Boolean(
    selectedSkripsi &&
      dosenAssignments.some((item) => item.skripsi.id === selectedSkripsi.id)
  );

  const isPembimbingAktifUntukSkripsi =
    pembimbingOptions.some((item) => item.dosen?.id === user?.id) ||
    (isSelectedFromDosenAssignments &&
      hasRole("dosen_pembimbing") &&
      !canManageBimbingan);

  const canApproveMajuSidang =
    canRequestSidang &&
    isPembimbingAktifUntukSkripsi &&
    selectedSkripsi?.status !== "MENUNGGU_JADWAL";

  const requestMutation = useMutation({
    mutationFn: () =>
      requestBimbingan(selectedSkripsiId, {
        dosenId: requestForm.dosenId,
        jadwalMulai: toIsoDateTime(requestForm.jadwalMulai),
        jadwalSelesai: toIsoDateTime(requestForm.jadwalSelesai),
        topik: requestForm.topik.trim()
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bimbingan"] }),
        queryClient.invalidateQueries({ queryKey: ["bimbingan-counter"] })
      ]);

      setRequestForm(emptyRequestForm);
      closeDrawer();
      setPageError("");
      setSuccessMessage("Pengajuan bimbingan berhasil dibuat.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal mengajukan bimbingan. Pastikan dosen pembimbing dan jadwal valid."
        )
      );
    }
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      confirmBimbingan(id, {
        catatanDosen: catatanDosen.trim() || undefined
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bimbingan"] });

      closeDrawer();
      setSuccessMessage("Pengajuan bimbingan berhasil disetujui.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal menyetujui bimbingan."));
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) =>
      rejectBimbingan(id, {
        catatanDosen: catatanDosen.trim() || undefined
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bimbingan"] });

      closeDrawer();
      setSuccessMessage("Pengajuan bimbingan berhasil ditolak.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal menolak bimbingan."));
    }
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) =>
      completeBimbingan(id, {
        hasil: hasilBimbingan.trim(),
        catatanDosen: catatanDosen.trim() || undefined
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["bimbingan"] });

      closeDrawer();
      setSuccessMessage("Hasil bimbingan berhasil disimpan.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal menyimpan hasil bimbingan."));
    }
  });

  const validateMutation = useMutation({
    mutationFn: (id: string) =>
      validateBimbingan(id, {
        catatanMahasiswa: catatanMahasiswa.trim() || undefined
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bimbingan"] }),
        queryClient.invalidateQueries({ queryKey: ["bimbingan-counter"] }),
        queryClient.invalidateQueries({ queryKey: ["my-gamification-dashboard"] })
      ]);

      closeDrawer();
      setSuccessMessage("Bimbingan berhasil dikonfirmasi mahasiswa.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(error, "Gagal mengonfirmasi bimbingan.")
      );
    }
  });

  const approveSidangMutation = useMutation({
    mutationFn: (skripsiId: string) => approveMajuSidang(skripsiId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bimbingan"] }),
        queryClient.invalidateQueries({ queryKey: ["bimbingan-counter"] }),
        queryClient.invalidateQueries({ queryKey: ["my-skripsi"] }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-summary-for-bimbingan"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["managed-skripsi-for-bimbingan"]
        })
      ]);

      setPageError("");
      setSuccessMessage(
        "Mahasiswa berhasil disetujui maju sidang. Status berubah menjadi MENUNGGU_JADWAL."
      );
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal approve maju sidang."));
    }
  });

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedLog(null);
    setCatatanDosen("");
    setHasilBimbingan("");
    setCatatanMahasiswa("");
    setPageError("");
  }

  function openRequestDrawer() {
    setDrawerMode("request");
    setSelectedLog(null);
    setCatatanDosen("");
    setHasilBimbingan("");
    setCatatanMahasiswa("");
    setPageError("");
    setSuccessMessage("");
  }

  function openDetailDrawer(log: BimbinganLog) {
    setSelectedLog(log);
    setDrawerMode("detail");
    setCatatanDosen(log.catatanDosen || "");
    setHasilBimbingan(log.hasil || "");
    setCatatanMahasiswa(log.catatanMahasiswa || "");
    setPageError("");
    setSuccessMessage("");
  }

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedSkripsiId) {
      setPageError("Pilih skripsi terlebih dahulu.");
      return;
    }

    if (!requestForm.dosenId) {
      setPageError("Pilih dosen pembimbing terlebih dahulu.");
      return;
    }

    if (
      new Date(requestForm.jadwalSelesai).getTime() <=
      new Date(requestForm.jadwalMulai).getTime()
    ) {
      setPageError("Jadwal selesai harus lebih besar dari jadwal mulai.");
      return;
    }

    requestMutation.mutate();
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Bimbingan"
        title="Bimbingan Skripsi"
        description="Ajukan bimbingan, validasi hasil bimbingan, dan pantau syarat minimal 8x bimbingan valid."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !drawerMode ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card bimbingan-summary-card">
        <div className="bimbingan-summary-grid">
          <label>
            <span>Pilih Skripsi</span>
            <select
              value={selectedSkripsiId}
              onChange={(event) => {
                setSelectedSkripsiId(event.target.value);
                setPageError("");
                setSuccessMessage("");
              }}
            >
              {skripsiOptions.length === 0 ? (
                <option value="">Belum ada skripsi</option>
              ) : (
                skripsiOptions.map((skripsi) => (
                  <option key={skripsi.id} value={skripsi.id}>
                    {skripsi.title || "Tanpa judul"} — {skripsi.status}
                  </option>
                ))
              )}
            </select>
          </label>

          <div className="bimbingan-progress-panel">
            <div className="progress-summary-head">
              <div>
                <strong>
                  {validCount}/{requiredCount}
                </strong>
                <span>Bimbingan tervalidasi</span>
              </div>

              <StatusBadge
                value={canRequestSidang ? "SIAP_MAJU_SIDANG" : "BELUM_SIAP"}
                size="sm"
              />
            </div>

            <div className="progress-bar-shell">
              <div
                className="progress-bar-value"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="bimbingan-summary-meta">
              <span>Progress {percentage}%</span>
              <span>Pembimbing aktif {pembimbingOptions.length}</span>
              <span>Status {selectedSkripsi?.status || "-"}</span>
            </div>
          </div>

          <div className="bimbingan-summary-actions">
            {selectedSkripsi?.status === "MENUNGGU_JADWAL" ? (
              <div className="state-card success">Sudah menunggu jadwal.</div>
            ) : canRequestSidang ? (
              canApproveMajuSidang ? (
                <button
                  type="button"
                  className="primary-button"
                  disabled={approveSidangMutation.isPending}
                  onClick={() =>
                    selectedSkripsi &&
                    approveSidangMutation.mutate(selectedSkripsi.id)
                  }
                >
                  {approveSidangMutation.isPending
                    ? "Memproses..."
                    : "Approve Maju Sidang"}
                </button>
              ) : (
                <div className="state-card success">
                  8/8 bimbingan sudah tervalidasi. Approval hanya dapat
                  dilakukan oleh dosen pembimbing aktif.
                </div>
              )
            ) : (
              <div className="state-card">
                Butuh {Math.max(requiredCount - validCount, 0)} bimbingan
                tervalidasi lagi.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="list-card bimbingan-table-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Riwayat Bimbingan</h2>
            <p className="muted">
              List pengajuan dan hasil bimbingan berdasarkan skripsi terpilih.
            </p>
          </div>

          <div className="master-toolbar-actions">
            {isMahasiswa ? (
              <button
                type="button"
                className="primary-button"
                onClick={openRequestDrawer}
                disabled={!selectedSkripsi || pembimbingOptions.length === 0}
              >
                Ajukan Bimbingan
              </button>
            ) : null}
          </div>
        </div>

        {!selectedSkripsi ? (
          <EmptyState
            title="Belum ada skripsi"
            description="Pilih atau buat skripsi terlebih dahulu."
          />
        ) : bimbinganQuery.isLoading ? (
          <EmptyState
            title="Memuat bimbingan..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={logs}
            emptyMessage="Belum ada riwayat bimbingan"
            columns={[
              {
                key: "no",
                header: "No",
                align: "center",
                render: (_item, index) => index + 1
              },
              {
                key: "topik",
                header: "Topik",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.topik || "-"}</strong>
                    <span>{getLogSchedule(item)}</span>
                  </div>
                )
              },
              {
                key: "mahasiswa",
                header: "Mahasiswa",
                render: (item) => item.mahasiswa?.name || "-"
              },
              {
                key: "dosen",
                header: "Dosen",
                render: (item) => item.dosen?.name || "-"
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => <StatusBadge value={item.status} size="sm" />
              },
              {
                key: "hasil",
                header: "Hasil",
                render: (item) => item.hasil || "-"
              },
              {
                key: "actions",
                header: "Aksi",
                align: "right",
                render: (item) => (
                  <div className="table-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => openDetailDrawer(item)}
                    >
                      Detail
                    </button>
                  </div>
                )
              }
            ]}
          />
        )}
      </section>

      {drawerMode ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside
            className="crud-drawer bimbingan-drawer"
            aria-label="Form bimbingan"
          >
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">
                  {drawerMode === "request" ? "Tambah Data" : "Detail Data"}
                </p>
                <h2>
                  {drawerMode === "request"
                    ? "Ajukan Bimbingan"
                    : "Detail Bimbingan"}
                </h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closeDrawer}
              >
                Tutup
              </button>
            </div>

            {pageError ? <div className="alert-error">{pageError}</div> : null}

            {drawerMode === "request" ? (
              <form className="form-stack" onSubmit={handleRequestSubmit}>
                {pembimbingOptions.length === 0 ? (
                  <div className="alert-error">
                    Dosen pembimbing belum ditentukan. Hubungi koordinator atau
                    admin untuk assign pembimbing terlebih dahulu.
                  </div>
                ) : null}

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
                      <option key={item.dosen.id} value={item.dosen.id}>
                        {item.dosen.name}
                      </option>
                    ))}
                  </select>
                </label>

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
                  {requestMutation.isPending
                    ? "Mengajukan..."
                    : "Ajukan Bimbingan"}
                </button>
              </form>
            ) : selectedLog ? (
              <div className="bimbingan-detail-stack">
                <div className="skripsi-detail-title">
                  <strong>{selectedLog.topik || "-"}</strong>
                  <StatusBadge value={selectedLog.status} />
                </div>

                <div className="info-list">
                  <div className="info-row">
                    <span>Jadwal</span>
                    <strong>{getLogSchedule(selectedLog)}</strong>
                  </div>

                  <div className="info-row">
                    <span>Mahasiswa</span>
                    <strong>{selectedLog.mahasiswa?.name || "-"}</strong>
                  </div>

                  <div className="info-row">
                    <span>Dosen</span>
                    <strong>{selectedLog.dosen?.name || "-"}</strong>
                  </div>

                  <div className="info-row">
                    <span>Hasil</span>
                    <p>{selectedLog.hasil || "-"}</p>
                  </div>

                  <div className="info-row">
                    <span>Catatan Dosen</span>
                    <p>{selectedLog.catatanDosen || "-"}</p>
                  </div>

                  <div className="info-row">
                    <span>Catatan Mahasiswa</span>
                    <p>{selectedLog.catatanMahasiswa || "-"}</p>
                  </div>
                </div>

                {isDosen && selectedLog.status === "DIAJUKAN" ? (
                  <div className="drawer-section">
                    <h3>Review Pengajuan</h3>

                    <label>
                      <span>Catatan Dosen</span>
                      <textarea
                        value={catatanDosen}
                        onChange={(event) => setCatatanDosen(event.target.value)}
                        placeholder="Catatan persetujuan atau alasan penolakan"
                      />
                    </label>

                    <div className="page-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={confirmMutation.isPending}
                        onClick={() => confirmMutation.mutate(selectedLog.id)}
                      >
                        Setujui
                      </button>

                      <button
                        type="button"
                        className="danger-button"
                        disabled={rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate(selectedLog.id)}
                      >
                        Tolak
                      </button>
                    </div>
                  </div>
                ) : null}

                {isDosen && selectedLog.status === "DISETUJUI" ? (
                  <div className="drawer-section">
                    <h3>Isi Hasil Bimbingan</h3>

                    <label>
                      <span>Hasil Bimbingan</span>
                      <textarea
                        value={hasilBimbingan}
                        onChange={(event) =>
                          setHasilBimbingan(event.target.value)
                        }
                        placeholder="Tuliskan hasil bimbingan"
                        required
                      />
                    </label>

                    <label>
                      <span>Catatan Dosen</span>
                      <textarea
                        value={catatanDosen}
                        onChange={(event) => setCatatanDosen(event.target.value)}
                        placeholder="Catatan tambahan dosen"
                      />
                    </label>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        completeMutation.isPending || !hasilBimbingan.trim()
                      }
                      onClick={() => completeMutation.mutate(selectedLog.id)}
                    >
                      {completeMutation.isPending
                        ? "Menyimpan..."
                        : "Simpan Hasil Bimbingan"}
                    </button>
                  </div>
                ) : null}

                {isMahasiswa && selectedLog.status === "SELESAI" ? (
                  <div className="drawer-section">
                    <h3>Konfirmasi Mahasiswa</h3>

                    <label>
                      <span>Catatan Mahasiswa</span>
                      <textarea
                        value={catatanMahasiswa}
                        onChange={(event) =>
                          setCatatanMahasiswa(event.target.value)
                        }
                        placeholder="Catatan konfirmasi mahasiswa"
                      />
                    </label>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={validateMutation.isPending}
                      onClick={() => validateMutation.mutate(selectedLog.id)}
                    >
                      {validateMutation.isPending
                        ? "Memproses..."
                        : "Konfirmasi Bimbingan"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}