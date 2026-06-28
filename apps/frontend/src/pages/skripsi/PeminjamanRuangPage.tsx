import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import { getRuang } from "../../services/masterData";
import {
  approvePeminjamanRuang,
  createPeminjamanRuang,
  getMyPeminjamanRuang,
  getPeminjamanRuang,
  rejectPeminjamanRuang
} from "../../services/peminjamanRuang";
import { getMySkripsi } from "../../services/skripsi";
import StatusBadge from "../../components/ui/StatusBadge";

function toIso(value: string) {
  return new Date(value).toISOString();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function PeminjamanRuangPage() {
  const { hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const isMahasiswa = hasRole("mahasiswa");
  const canApprove = hasPermission("ruang.approve");

  const [form, setForm] = useState({
    skripsiId: "",
    ruangId: "",
    tanggal: "",
    waktuMulai: "",
    waktuSelesai: "",
    keperluan: ""
  });

  const ruangQuery = useQuery({
    queryKey: ["ruang"],
    queryFn: getRuang
  });

  const mySkripsiQuery = useQuery({
    queryKey: ["my-skripsi"],
    queryFn: getMySkripsi,
    enabled: isMahasiswa
  });

  const myBorrowingQuery = useQuery({
    queryKey: ["my-peminjaman-ruang"],
    queryFn: getMyPeminjamanRuang,
    enabled: isMahasiswa
  });

  const allBorrowingQuery = useQuery({
    queryKey: ["peminjaman-ruang"],
    queryFn: () =>
      getPeminjamanRuang({
        limit: 30
      }),
    enabled: canApprove
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createPeminjamanRuang({
        skripsiId: form.skripsiId || null,
        ruangId: form.ruangId,
        tanggal: toIso(form.tanggal),
        waktuMulai: toIso(form.waktuMulai),
        waktuSelesai: toIso(form.waktuSelesai),
        keperluan: form.keperluan
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-peminjaman-ruang"] });
      queryClient.invalidateQueries({ queryKey: ["peminjaman-ruang"] });
      setForm({
        skripsiId: "",
        ruangId: "",
        tanggal: "",
        waktuMulai: "",
        waktuSelesai: "",
        keperluan: ""
      });
    }
  });

  const approveMutation = useMutation({
    mutationFn: approvePeminjamanRuang,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peminjaman-ruang"] });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, alasan }: { id: string; alasan: string }) =>
      rejectPeminjamanRuang(id, alasan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peminjaman-ruang"] });
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createMutation.mutate();
  }

  function handleReject(id: string) {
    const alasan = window.prompt("Alasan penolakan:");

    if (!alasan) {
      return;
    }

    rejectMutation.mutate({
      id,
      alasan
    });
  }

  const ruangRows = ruangQuery.data ?? [];
  const mySkripsiRows = mySkripsiQuery.data ?? [];
  const rows = canApprove
    ? allBorrowingQuery.data?.data ?? []
    : myBorrowingQuery.data ?? [];

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Ruang</p>
        <h1>Peminjaman Ruang</h1>
        <p className="muted">
          Ajukan peminjaman ruang dan kelola approval peminjaman.
        </p>
      </div>

      {isMahasiswa ? (
        <form className="card form-stack" onSubmit={handleSubmit}>
          <h2>Ajukan Peminjaman Ruang</h2>

          <label>
            <span>Skripsi</span>
            <select
              value={form.skripsiId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  skripsiId: event.target.value
                }))
              }
            >
              <option value="">Tanpa relasi skripsi</option>
              {mySkripsiRows.map((skripsi) => (
                <option key={skripsi.id} value={skripsi.id}>
                  {skripsi.title || "Tanpa judul"} — {skripsi.status}
                </option>
              ))}
            </select>
          </label>

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
              required
            >
              <option value="">Pilih ruang</option>
              {ruangRows.map((ruang) => (
                <option key={ruang.id} value={ruang.id}>
                  {ruang.code} — {ruang.name}
                </option>
              ))}
            </select>
          </label>

          <section className="two-column compact">
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
          </section>

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

          <label>
            <span>Keperluan</span>
            <textarea
              value={form.keperluan}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  keperluan: event.target.value
                }))
              }
              placeholder="Contoh: Latihan presentasi sidang skripsi"
              required
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? "Mengajukan..." : "Ajukan Peminjaman"}
          </button>

          {createMutation.isError ? (
            <div className="alert-error">
              Gagal mengajukan peminjaman. Pastikan ruang dan jadwal tidak
              bentrok.
            </div>
          ) : null}
        </form>
      ) : null}

      <section className="list-card">
        <h2>{canApprove ? "Semua Peminjaman" : "Peminjaman Saya"}</h2>

        {rows.length === 0 ? (
          <p>Belum ada data peminjaman ruang.</p>
        ) : (
          rows.map((item) => (
            <article key={item.id} className="academic-card">
              <div className="page-header-row">
                <div>
                  <strong>{item.ruang.name}</strong>
                  <p className="muted">
                    {formatDateTime(item.waktuMulai)} -{" "}
                    {formatDateTime(item.waktuSelesai)}
                  </p>
                  <small>
                    Mahasiswa: {item.mahasiswa?.name || "-"} •{" "}
                    {item.keperluan}
                  </small>
                </div>

                <StatusBadge value={item.status} size="sm" />
              </div>

              {item.alasan ? (
                <div className="alert-error">Alasan: {item.alasan}</div>
              ) : null}

              {canApprove && item.status === "DIAJUKAN" ? (
                <div className="row-inline">
                  <button
                    className="primary-button"
                    onClick={() => approveMutation.mutate(item.id)}
                  >
                    Approve
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => handleReject(item.id)}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </section>
  );
}