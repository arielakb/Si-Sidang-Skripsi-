import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  createJadwalSidang,
  getJadwalSidang,
  updateJadwalSidangStatus
} from "../../services/jadwalSidang";
import { getRuang } from "../../services/masterData";
import { getSkripsiList } from "../../services/skripsi";
import type { JadwalSidangItem, JadwalSidangStatus } from "../../types/jadwal";
import { getApiErrorMessage } from "../../utils/apiError";

type DrawerMode = "create" | "detail" | null;

type JadwalRow = JadwalSidangItem & {
  skripsi?: {
    id?: string;
    title?: string | null;
    mahasiswa?: {
      name?: string | null;
      identifier?: string | null;
    } | null;
  } | null;
  ruang?: {
    id?: string;
    code?: string | null;
    name?: string | null;
  } | null;
  penguji?: Array<{
    id: string;
    dosen?: {
      name?: string | null;
      identifier?: string | null;
    } | null;
  }>;
};

const emptyForm = {
  skripsiId: "",
  ruangId: "",
  tanggal: "",
  waktuMulai: "",
  waktuSelesai: "",
  tempatManual: "",
  linkVicon: ""
};

const statusOptions: JadwalSidangStatus[] = [
  "DIJADWALKAN",
  "BERLANGSUNG",
  "SELESAI",
  "DIBATALKAN"
];

function toIsoDate(value: string, fallbackDateTime?: string) {
  if (value) {
    return new Date(`${value}T00:00:00`).toISOString();
  }

  if (fallbackDateTime) {
    return new Date(fallbackDateTime).toISOString();
  }

  return "";
}

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

function getTempat(row: JadwalRow) {
  if (row.ruang) {
    return `${row.ruang.code || ""} ${row.ruang.name || ""}`.trim();
  }

  return row.tempatManual || row.linkVicon || "-";
}

function isValidScheduleRange(waktuMulai: string, waktuSelesai: string) {
  if (!waktuMulai || !waktuSelesai) return false;

  return new Date(waktuSelesai).getTime() > new Date(waktuMulai).getTime();
}

export default function JadwalSidangPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canManage = hasPermission("jadwal_sidang.manage");

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedJadwal, setSelectedJadwal] = useState<JadwalRow | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const jadwalQuery = useQuery({
    queryKey: ["jadwal-sidang"],
    queryFn: () =>
      getJadwalSidang({
        limit: 50
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

  const jadwalRows = (jadwalQuery.data?.data ?? []) as JadwalRow[];
  const skripsiCandidates = skripsiCandidatesQuery.data?.data ?? [];
  const ruangRows = ruangQuery.data ?? [];

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return jadwalRows.filter((item) => {
      const matchesSearch = `${item.skripsi?.title ?? ""} ${
        item.skripsi?.mahasiswa?.name ?? ""
      } ${item.status ?? ""} ${getTempat(item)}`
        .toLowerCase()
        .includes(keyword);

      const matchesStatus = statusFilter ? item.status === statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }, [jadwalRows, search, statusFilter]);

  const createMutation = useMutation({
    mutationFn: () =>
      createJadwalSidang({
        skripsiId: form.skripsiId,
        ruangId: form.ruangId || null,
        tanggal: toIsoDate(form.tanggal, form.waktuMulai),
        waktuMulai: toIsoDateTime(form.waktuMulai),
        waktuSelesai: toIsoDateTime(form.waktuSelesai),
        tempatManual: form.tempatManual.trim() || null,
        linkVicon: form.linkVicon.trim() || null,
        pengujiIds: []
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["jadwal-sidang"] }),
        queryClient.invalidateQueries({ queryKey: ["skripsi-menunggu-jadwal"] }),
        queryClient.invalidateQueries({ queryKey: ["my-skripsi"] }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-summary-for-bimbingan"]
        })
      ]);

      setForm(emptyForm);
      closeDrawer();
      setPageError("");
      setSuccessMessage("Jadwal sidang berhasil dibuat.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal membuat jadwal. Pastikan skripsi berstatus MENUNGGU_JADWAL, waktu valid, dan ruang tidak bentrok."
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

      setPageError("");
      setSuccessMessage("Status jadwal berhasil diperbarui.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal mengubah status jadwal."));
    }
  });

  function openCreateDrawer() {
    setDrawerMode("create");
    setSelectedJadwal(null);
    setForm(emptyForm);
    setPageError("");
    setSuccessMessage("");
  }

  function openDetailDrawer(jadwal: JadwalRow) {
    setDrawerMode("detail");
    setSelectedJadwal(jadwal);
    setPageError("");
    setSuccessMessage("");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedJadwal(null);
    setForm(emptyForm);
    setPageError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPageError("");
    setSuccessMessage("");

    if (!form.skripsiId) {
      setPageError("Pilih skripsi terlebih dahulu.");
      return;
    }

    if (!isValidScheduleRange(form.waktuMulai, form.waktuSelesai)) {
      setPageError("Waktu selesai harus lebih besar dari waktu mulai.");
      return;
    }

    if (!form.ruangId && !form.tempatManual.trim() && !form.linkVicon.trim()) {
      setPageError("Pilih ruang, isi tempat manual, atau isi link vicon.");
      return;
    }

    createMutation.mutate();
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Sidang"
        title="Jadwal Sidang"
        description="Kelola jadwal sidang untuk skripsi yang sudah disetujui maju sidang."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !drawerMode ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card jadwal-table-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Daftar Jadwal Sidang</h2>
            <p className="muted">
              List jadwal sidang, ruang, waktu, dan status pelaksanaan.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, mahasiswa, ruang..."
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Semua Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {canManage ? (
              <button
                type="button"
                className="primary-button"
                onClick={openCreateDrawer}
              >
                Buat Jadwal
              </button>
            ) : null}
          </div>
        </div>

        {jadwalQuery.isLoading ? (
          <EmptyState
            title="Memuat jadwal sidang..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRows}
            emptyMessage="Belum ada jadwal sidang"
            columns={[
              {
                key: "no",
                header: "No",
                align: "center",
                render: (_item, index) => index + 1
              },
              {
                key: "skripsi",
                header: "Skripsi",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.skripsi?.title || "Tanpa judul"}</strong>
                    <span>
                      {item.skripsi?.mahasiswa?.name || "Mahasiswa tidak tersedia"}
                    </span>
                  </div>
                )
              },
              {
                key: "waktu",
                header: "Waktu",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{formatDateTime(item.waktuMulai)}</strong>
                    <span>Selesai: {formatDateTime(item.waktuSelesai)}</span>
                  </div>
                )
              },
              {
                key: "tempat",
                header: "Tempat",
                render: (item) => getTempat(item)
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => <StatusBadge value={item.status} size="sm" />
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
          <aside className="crud-drawer jadwal-drawer" aria-label="Form jadwal">
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">
                  {drawerMode === "create" ? "Tambah Data" : "Detail Data"}
                </p>
                <h2>
                  {drawerMode === "create"
                    ? "Buat Jadwal Sidang"
                    : "Detail Jadwal Sidang"}
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

            {drawerMode === "create" ? (
              <form className="form-stack" onSubmit={handleSubmit}>
                <label>
                  <span>Skripsi Status MENUNGGU_JADWAL</span>
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
                    <option value="">Pilih skripsi</option>
                    {skripsiCandidates.map((skripsi) => (
                      <option key={skripsi.id} value={skripsi.id}>
                        {skripsi.title || "Tanpa judul"} — {skripsi.status}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Tanggal</span>
                  <input
                    type="date"
                    value={form.tanggal}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        tanggal: event.target.value
                      }))
                    }
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
                    <option value="">Tanpa ruang / gunakan manual</option>
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
                    placeholder="Contoh: Ruang Sidang Fakultas"
                  />
                </label>

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
                  type="submit"
                  className="primary-button"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Menyimpan..." : "Buat Jadwal"}
                </button>
              </form>
            ) : selectedJadwal ? (
              <div className="jadwal-detail-stack">
                <div className="skripsi-detail-title">
                  <strong>{selectedJadwal.skripsi?.title || "Tanpa judul"}</strong>
                  <StatusBadge value={selectedJadwal.status} />
                </div>

                <div className="info-list">
                  <div className="info-row">
                    <span>Mahasiswa</span>
                    <strong>{selectedJadwal.skripsi?.mahasiswa?.name || "-"}</strong>
                  </div>

                  <div className="info-row">
                    <span>Waktu Mulai</span>
                    <strong>{formatDateTime(selectedJadwal.waktuMulai)}</strong>
                  </div>

                  <div className="info-row">
                    <span>Waktu Selesai</span>
                    <strong>{formatDateTime(selectedJadwal.waktuSelesai)}</strong>
                  </div>

                  <div className="info-row">
                    <span>Tempat</span>
                    <strong>{getTempat(selectedJadwal)}</strong>
                  </div>

                  <div className="info-row">
                    <span>Link Vicon</span>
                    <p>{selectedJadwal.linkVicon || "-"}</p>
                  </div>
                </div>

                {canManage ? (
                  <div className="drawer-section">
                    <h3>Ubah Status Jadwal</h3>

                    <div className="status-action-grid">
                      {statusOptions.map((status) => (
                        <button
                          key={status}
                          type="button"
                          className={
                            selectedJadwal.status === status
                              ? "primary-button"
                              : status === "DIBATALKAN"
                                ? "danger-button"
                                : "secondary-button"
                          }
                          disabled={
                            statusMutation.isPending ||
                            selectedJadwal.status === status
                          }
                          onClick={() =>
                            statusMutation.mutate({
                              id: selectedJadwal.id,
                              status
                            })
                          }
                        >
                          {status}
                        </button>
                      ))}
                    </div>
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