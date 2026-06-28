import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import {
  createJadwalSidang,
  getJadwalSidang,
  updateJadwalSidangStatus
} from "../../services/jadwalSidang";
import { getRuang } from "../../services/masterData";
import { getSkripsiList } from "../../services/skripsi";
import type { JadwalSidangStatus } from "../../types/jadwal";
import StatusBadge from "../../components/ui/StatusBadge";
import { getApiErrorMessage } from "../../utils/apiError";

function toIso(value: string) {
  if (!value) return "";

  return new Date(value).toISOString();
}

function isValidScheduleRange(waktuMulai: string, waktuSelesai: string) {
  if (!waktuMulai || !waktuSelesai) return false;

  return new Date(waktuSelesai).getTime() > new Date(waktuMulai).getTime();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function JadwalSidangPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canManage = hasPermission("jadwal_sidang.manage");

  const [form, setForm] = useState({
    skripsiId: "",
    ruangId: "",
    tanggal: "",
    waktuMulai: "",
    waktuSelesai: "",
    tempatManual: "",
    linkVicon: ""
  });
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const jadwalQuery = useQuery({
    queryKey: ["jadwal-sidang"],
    queryFn: () =>
      getJadwalSidang({
        limit: 30
      })
  });

  const ruangQuery = useQuery({
    queryKey: ["ruang"],
    queryFn: getRuang
  });

  const skripsiCandidatesQuery = useQuery({
    queryKey: ["skripsi-menunggu-jadwal"],
    queryFn: () =>
      getSkripsiList({
        status: "MENUNGGU_JADWAL",
        limit: 50
      }),
    enabled: canManage
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createJadwalSidang({
        skripsiId: form.skripsiId,
        ruangId: form.ruangId || null,
        tanggal: toIso(form.tanggal || form.waktuMulai),
        waktuMulai: toIso(form.waktuMulai),
        waktuSelesai: toIso(form.waktuSelesai),
        tempatManual: form.tempatManual || null,
        linkVicon: form.linkVicon || null,
        pengujiIds: []
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["jadwal-sidang"] }),
        queryClient.invalidateQueries({ queryKey: ["skripsi-menunggu-jadwal"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary-for-bimbingan"] }),
        queryClient.invalidateQueries({ queryKey: ["my-skripsi"] })
      ]);

      setForm({
        skripsiId: "",
        ruangId: "",
        tanggal: "",
        waktuMulai: "",
        waktuSelesai: "",
        tempatManual: "",
        linkVicon: ""
      });

      setFormError("");
      setSuccessMessage("Jadwal sidang berhasil dibuat.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setFormError(
        getApiErrorMessage(
          error,
          "Gagal membuat jadwal. Pastikan skripsi berstatus MENUNGGU_JADWAL dan ruang tidak bentrok."
        )
      );
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status
    }: {
      id: string;
      status: JadwalSidangStatus;
    }) => updateJadwalSidangStatus(id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["jadwal-sidang"] });
      setSuccessMessage("Status jadwal sidang berhasil diperbarui.");
    },
    onError: (error) => {
      setFormError(getApiErrorMessage(error, "Gagal memperbarui status jadwal."));
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    if (!isValidScheduleRange(form.waktuMulai, form.waktuSelesai)) {
      setFormError("Waktu selesai harus lebih besar dari waktu mulai.");
      return;
    }

    if (!form.ruangId && !form.tempatManual.trim() && !form.linkVicon.trim()) {
      setFormError(
        "Pilih ruang, isi tempat manual, atau masukkan link vicon."
      );
      return;
    }

    createMutation.mutate();
  }

  const jadwalRows = jadwalQuery.data?.data ?? [];
  const skripsiCandidates = skripsiCandidatesQuery.data?.data ?? [];
  const ruangRows = ruangQuery.data ?? [];

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Sidang</p>
        <h1>Jadwal Sidang</h1>
        <p className="muted">
          Buat jadwal sidang untuk skripsi yang sudah disetujui maju sidang dan berstatus MENUNGGU_JADWAL.
        </p>
      </div>

      {canManage ? (
        <form className="card form-stack" onSubmit={handleSubmit}>
          <h2>Buat Jadwal Sidang</h2>

          <label>
            <span>Skripsi Siap Dijadwalkan</span>
            <select
              value={form.skripsiId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  skripsiId: event.target.value
                }))
              }
              required
            >
              <option value="">Pilih skripsi status MENUNGGU_JADWAL</option>
              {skripsiCandidates.map((skripsi) => (
                <option key={skripsi.id} value={skripsi.id}>
                  {skripsi.title || "Tanpa judul"} —{" "}
                  {skripsi.mahasiswa?.name || skripsi.mahasiswaId}
                </option>
              ))}
            </select>
          </label>

          <section className="two-column compact">
            <label>
              <span>Ruang</span>
              <select
                value={form.ruangId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    ruangId: event.target.value
                  }))
                }
              >
                <option value="">Tanpa ruang / manual</option>
                {ruangRows.map((ruang) => (
                  <option key={ruang.id} value={ruang.id}>
                    {ruang.code} — {ruang.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Tempat Manual</span>
              <input
                value={form.tempatManual}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    tempatManual: event.target.value
                  }))
                }
                placeholder="Opsional jika tanpa ruang"
              />
            </label>
          </section>

          <label>
            <span>Tanggal</span>
            <input
              type="datetime-local"
              value={form.tanggal}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  tanggal: event.target.value
                }))
              }
              required
            />
          </label>

          <section className="two-column compact">
            <label>
              <span>Waktu Mulai</span>
              <input
                type="datetime-local"
                value={form.waktuMulai}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    waktuMulai: event.target.value
                  }))
                }
                required
              />
            </label>

            <label>
              <span>Waktu Selesai</span>
              <input
                type="datetime-local"
                value={form.waktuSelesai}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    waktuSelesai: event.target.value
                  }))
                }
                required
              />
            </label>
          </section>

          <label>
            <span>Link Vicon</span>
            <input
              value={form.linkVicon}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  linkVicon: event.target.value
                }))
              }
              placeholder="https://meet.google.com/..."
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Menyimpan..." : "Buat Jadwal"}
          </button>

          {formError ? <div className="alert-error">{formError}</div> : null}

          {successMessage ? (
            <div className="state-card success">{successMessage}</div>
          ) : null}
        </form>
      ) : null}

      <section className="list-card">
        <h2>Daftar Jadwal Sidang</h2>

        {jadwalQuery.isLoading ? (
          <p>Memuat jadwal...</p>
        ) : jadwalRows.length === 0 ? (
          <p>Belum ada jadwal sidang.</p>
        ) : (
          jadwalRows.map((jadwal) => (
            <article key={jadwal.id} className="academic-card">
              <div className="page-header-row">
                <div>
                  <strong>{jadwal.skripsi.title || "Tanpa judul"}</strong>
                  <p className="muted">
                    {jadwal.skripsi.mahasiswa.name} •{" "}
                    {formatDateTime(jadwal.waktuMulai)} -{" "}
                    {formatDateTime(jadwal.waktuSelesai)}
                  </p>
                  <small>
                    Ruang: {jadwal.ruang?.name || jadwal.tempatManual || "-"}
                  </small>
                </div>

               <StatusBadge value={jadwal.status} size="sm" />
              </div>

              <div className="mini-grid">
                <span>Peminatan: {jadwal.skripsi.peminatan?.name || "-"}</span>
                <span>Vicon: {jadwal.linkVicon || "-"}</span>
                <span>Status skripsi: {jadwal.skripsi.status}</span>
              </div>

              {canManage ? (
                <div className="row-inline">
                  {(
                    [
                      "DIJADWALKAN",
                      "BERLANGSUNG",
                      "SELESAI",
                      "DIBATALKAN"
                    ] as JadwalSidangStatus[]
                  ).map((status) => (
                    <button
                      key={status}
                      className="secondary-button"
                      onClick={() =>
                        statusMutation.mutate({
                          id: jadwal.id,
                          status
                        })
                      }
                      disabled={jadwal.status === status}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </section>
  );
}