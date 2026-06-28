import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
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
  getMySkripsi
} from "../../services/skripsi";
import type { BimbinganLog } from "../../types/bimbingan";
import type { SkripsiSummary } from "../../types/skripsi";
import StatusBadge from "../../components/ui/StatusBadge";
import { getApiErrorMessage } from "../../utils/apiError";

type DashboardAssignment = {
  skripsi: SkripsiSummary;
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

export default function BimbinganPage() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const isMahasiswa = hasRole("mahasiswa");
  const isDosen = hasRole([
    "dosen_pembimbing",
    "dosen_penguji",
    "dosen_koordinator"
  ]);
  const canApproveMajuSidang = hasRole([
    "admin",
    "dosen_koordinator",
    "ketua_prodi",
    "staf_prodi"
  ]);

  const [selectedSkripsiId, setSelectedSkripsiId] = useState("");
  const [requestForm, setRequestForm] = useState({
    dosenId: "",
    jadwalMulai: "",
    jadwalSelesai: "",
    topik: ""
  });

  const mySkripsiQuery = useQuery({
    queryKey: ["my-skripsi"],
    queryFn: getMySkripsi
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

    if (isDosen) {
      return dosenAssignments.map((item) => item.skripsi);
    }

    return mySkripsiQuery.data ?? [];
  }, [isMahasiswa, isDosen, mySkripsiQuery.data, dosenAssignments]);

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

  const requestMutation = useMutation({
    mutationFn: () =>
      requestBimbingan(selectedSkripsiId, {
        dosenId: requestForm.dosenId,
        jadwalMulai: toIsoDateTime(requestForm.jadwalMulai),
        jadwalSelesai: toIsoDateTime(requestForm.jadwalSelesai),
        topik: requestForm.topik
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bimbingan"] });
      queryClient.invalidateQueries({ queryKey: ["bimbingan-counter"] });
      setRequestForm({
        dosenId: "",
        jadwalMulai: "",
        jadwalSelesai: "",
        topik: ""
      });
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
    }
  });

  const validateMutation = useMutation({
    mutationFn: ({
      id,
      catatanMahasiswa
    }: {
      id: string;
      catatanMahasiswa?: string;
    }) =>
      validateBimbingan(id, {
        catatanMahasiswa
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bimbingan"] });
      queryClient.invalidateQueries({ queryKey: ["bimbingan-counter"] });
      queryClient.invalidateQueries({ queryKey: ["my-gamification-dashboard"] });
    }
  });

  const approveSidangMutation = useMutation({
    mutationFn: (skripsiId: string) => approveMajuSidang(skripsiId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["bimbingan"] }),
        queryClient.invalidateQueries({ queryKey: ["bimbingan-counter"] }),
        queryClient.invalidateQueries({ queryKey: ["my-skripsi"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary-for-bimbingan"] })
      ]);

      alert("Skripsi berhasil masuk status SIAP SIDANG.");
    },
    onError: (error) => {
      alert(getApiErrorMessage(error, "Gagal approve maju sidang."));
    }
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

  function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    requestMutation.mutate();
  }

  function handleConfirm(log: BimbinganLog) {
    const catatanDosen =
      window.prompt("Catatan dosen untuk persetujuan bimbingan:", "") || "";

    confirmMutation.mutate({
      id: log.id,
      catatanDosen
    });
  }

  function handleReject(log: BimbinganLog) {
    const catatanDosen =
      window.prompt("Alasan penolakan pengajuan bimbingan:", "") || "";

    rejectMutation.mutate({
      id: log.id,
      catatanDosen
    });
  }

  function handleComplete(log: BimbinganLog) {
    const hasil = window.prompt("Isi hasil bimbingan:", "");

    if (!hasil) {
      return;
    }

    const catatanDosen =
      window.prompt("Catatan tambahan dosen:", "") || "";

    completeMutation.mutate({
      id: log.id,
      hasil,
      catatanDosen
    });
  }

  function handleValidate(log: BimbinganLog) {
    const catatanMahasiswa =
      window.prompt("Catatan konfirmasi mahasiswa:", "") || "";

    validateMutation.mutate({
      id: log.id,
      catatanMahasiswa
    });
  }

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Bimbingan</p>
        <h1>Bimbingan Skripsi</h1>
        <p className="muted">
          Ajukan bimbingan, validasi hasil bimbingan, dan pantau syarat 8x
          bimbingan valid.
        </p>
      </div>

      <section className="card form-stack">
        <label>
          <span>Pilih Skripsi</span>
          <select
            value={selectedSkripsiId}
            onChange={(event) => setSelectedSkripsiId(event.target.value)}
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

        {selectedSkripsi ? (
          <div className="progress-card">
            <div className="page-header-row">
              <div>
                <strong>{selectedSkripsi.title || "Tanpa judul"}</strong>
                <p className="muted">
                  {selectedSkripsi.tahap} • {selectedSkripsi.status}
                </p>
              </div>

              <strong>
                {validCount}/{requiredCount}
              </strong>
            </div>

            <div className="progress-bar">
              <span style={{ width: `${percentage}%` }} />
            </div>

            <div className="mini-grid">
              <span>Progress bimbingan: {percentage}%</span>
              <span>
                Maju sidang: {canRequestSidang ? "Siap" : "Belum siap"}
              </span>
              <span>Pembimbing: {pembimbingOptions.length}</span>
            </div>

            {canRequestSidang ? (
              canApproveMajuSidang ? (
                <button
                  type="button"
                  className="primary-button"
                  disabled={
                    approveSidangMutation.isPending ||
                    selectedSkripsi.status === "SIAP_SIDANG"
                  }
                  onClick={() => approveSidangMutation.mutate(selectedSkripsi.id)}
                >
                  {selectedSkripsi.status === "SIAP_SIDANG"
                    ? "Sudah Siap Sidang"
                    : approveSidangMutation.isPending
                      ? "Memproses..."
                      : "Approve Maju Sidang"}
                </button>
              ) : (
                <div className="state-card success">
                  8/8 bimbingan sudah tervalidasi. Silakan menunggu admin atau koordinator
                  menyetujui maju sidang.
                </div>
              )
            ) : (
              <div className="state-card">
                Butuh {Math.max(requiredCount - validCount, 0)} bimbingan tervalidasi lagi
                sebelum maju sidang.
              </div>
            )}
          </div>
        ) : null}
      </section>

      {isMahasiswa && selectedSkripsi ? (
        <form className="card form-stack" onSubmit={handleRequestSubmit}>
          <h2>Ajukan Bimbingan</h2>

          {pembimbingOptions.length === 0 ? (
            <div className="alert-error">
              Dosen pembimbing belum ditentukan. Hubungi koordinator atau admin
              untuk assign pembimbing terlebih dahulu.
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
            {requestMutation.isPending
              ? "Mengajukan..."
              : "Ajukan Bimbingan"}
          </button>

          {requestMutation.isError ? (
            <div className="alert-error">
              Gagal mengajukan bimbingan. Pastikan dosen pembimbing sudah
              dipilih dan jadwal valid.
            </div>
          ) : null}
        </form>
      ) : null}

      <section className="list-card">
        <h2>Riwayat Bimbingan</h2>

        {bimbinganQuery.isLoading ? (
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
                {isDosen && log.status === "DIAJUKAN" ? (
                  <>
                    <button
                      className="secondary-button"
                      onClick={() => handleConfirm(log)}
                    >
                      Setujui
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => handleReject(log)}
                    >
                      Tolak
                    </button>
                  </>
                ) : null}

                {isDosen && log.status === "DISETUJUI" ? (
                  <button
                    className="primary-button"
                    onClick={() => handleComplete(log)}
                  >
                    Isi Hasil Bimbingan
                  </button>
                ) : null}

                {isMahasiswa && log.status === "SELESAI" ? (
                  <button
                    className="primary-button"
                    onClick={() => handleValidate(log)}
                  >
                    Konfirmasi Bimbingan
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>
    </section>
  );
}