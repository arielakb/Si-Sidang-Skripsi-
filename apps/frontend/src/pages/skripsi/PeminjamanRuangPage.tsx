import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import DataTable from "../../components/ui/DataTable";
import FilterToolbar from "../../components/ui/FilterToolbar";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { getRuang } from "../../services/masterData";
import {
  approvePeminjamanRuang,
  createPeminjamanRuang,
  deletePeminjamanRuangPermanent,
  getMyPeminjamanRuang,
  getPeminjamanRuang,
  rejectPeminjamanRuang,
  updatePeminjamanRuangStatus
} from "../../services/peminjamanRuang";
import type { PeminjamanRuangItem } from "../../types/jadwal";
import { getApiErrorMessage } from "../../utils/apiError";

type DrawerMode = "create" | "detail" | null;

type PeminjamanRow = PeminjamanRuangItem & {
  mahasiswa?: {
    id?: string;
    name?: string | null;
    identifier?: string | null;
    email?: string | null;
  } | null;
  reviewedBy?: {
    id?: string;
    name?: string | null;
    identifier?: string | null;
  } | null;
  skripsi?: {
    id?: string;
    title?: string | null;
  } | null;
};

const emptyForm = {
  ruangId: "",
  tanggal: "",
  waktuMulai: "",
  waktuSelesai: "",
  keperluan: ""
};

const statusOptions = ["DIAJUKAN", "DISETUJUI", "DITOLAK", "DIBATALKAN"];

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

function formatDateOnly(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function getRuangLabel(item: PeminjamanRow) {
  const code = item.ruang?.code || "";
  const name = item.ruang?.name || "";

  return `${code} ${name}`.trim() || "-";
}

function getPeminjamLabel(item: PeminjamanRow) {
  return item.mahasiswa?.name || item.mahasiswaId || "-";
}

function isValidScheduleRange(waktuMulai: string, waktuSelesai: string) {
  if (!waktuMulai || !waktuSelesai) return false;

  return new Date(waktuSelesai).getTime() > new Date(waktuMulai).getTime();
}

export default function PeminjamanRuangPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canBorrow = hasPermission("ruang.borrow");
  const canApprove = hasPermission("ruang.approve");

  const canDeletePermanent = hasPermission("ruang.delete_permanent");

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedPeminjaman, setSelectedPeminjaman] =
    useState<PeminjamanRow | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [alasanReject, setAlasanReject] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const ruangQuery = useQuery({
    queryKey: ["ruang"],
    queryFn: () => getRuang()
  });

  const myPeminjamanQuery = useQuery({
    queryKey: ["my-peminjaman-ruang"],
    queryFn: getMyPeminjamanRuang,
    enabled: !canApprove
  });

  const allPeminjamanQuery = useQuery({
    queryKey: ["peminjaman-ruang", statusFilter],
    queryFn: () =>
      getPeminjamanRuang({
        status: statusFilter || undefined,
        limit: 100
      }),
    enabled: canApprove
  });

  const rows = useMemo(() => {
    if (canApprove) {
      return ((allPeminjamanQuery.data?.data ?? []) as PeminjamanRow[]);
    }

    return ((myPeminjamanQuery.data ?? []) as PeminjamanRow[]);
  }, [canApprove, allPeminjamanQuery.data, myPeminjamanQuery.data]);

  const ruangRows = ruangQuery.data ?? [];

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return rows.filter((item) => {
      const matchesSearch = `${getRuangLabel(item)} ${getPeminjamLabel(item)} ${
        item.keperluan ?? ""
      } ${item.status ?? ""}`
        .toLowerCase()
        .includes(keyword);

      const matchesStatus = statusFilter ? item.status === statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }, [rows, search, statusFilter]);

  const createMutation = useMutation({
    mutationFn: () =>
      createPeminjamanRuang({
        ruangId: form.ruangId,
        tanggal: toIsoDate(form.tanggal, form.waktuMulai),
        waktuMulai: toIsoDateTime(form.waktuMulai),
        waktuSelesai: toIsoDateTime(form.waktuSelesai),
        keperluan: form.keperluan.trim()
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-peminjaman-ruang"] }),
        queryClient.invalidateQueries({ queryKey: ["peminjaman-ruang"] })
      ]);

      setForm(emptyForm);
      closeDrawer();
      setPageError("");
      setSuccessMessage("Peminjaman ruang berhasil diajukan.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal mengajukan peminjaman. Pastikan ruang dan jadwal tidak bentrok."
        )
      );
    }
  });

  const approveMutation = useMutation({
    mutationFn: approvePeminjamanRuang,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["peminjaman-ruang"] });

      closeDrawer();
      setPageError("");
      setSuccessMessage("Peminjaman ruang berhasil disetujui.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(error, "Gagal menyetujui peminjaman ruang.")
      );
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, alasan }: { id: string; alasan: string }) =>
      rejectPeminjamanRuang(id, alasan),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["peminjaman-ruang"] });

      closeDrawer();
      setPageError("");
      setSuccessMessage("Peminjaman ruang berhasil ditolak.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(error, "Gagal menolak peminjaman ruang.")
      );
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      alasan
    }: {
      id: string;
      status: "DIAJUKAN" | "DISETUJUI" | "DITOLAK" | "DIBATALKAN";
      alasan?: string;
    }) =>
      updatePeminjamanRuangStatus(id, {
        status,
        alasan
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-peminjaman-ruang"] }),
        queryClient.invalidateQueries({ queryKey: ["peminjaman-ruang"] })
      ]);

      closeDrawer();
      setPageError("");
      setSuccessMessage("Status peminjaman ruang berhasil diperbarui.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(error, "Gagal mengubah status peminjaman ruang.")
      );
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePeminjamanRuangPermanent(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-peminjaman-ruang"] }),
        queryClient.invalidateQueries({ queryKey: ["peminjaman-ruang"] })
      ]);

      closeDrawer();
      setPageError("");
      setSuccessMessage("Peminjaman ruang berhasil dihapus permanen.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal menghapus permanen peminjaman ruang. Jika sudah disetujui, batalkan terlebih dahulu."
        )
      );
    }
  });

  function openCreateDrawer() {
    setDrawerMode("create");
    setSelectedPeminjaman(null);
    setForm(emptyForm);
    setAlasanReject("");
    setPageError("");
    setSuccessMessage("");
  }

  function openDetailDrawer(item: PeminjamanRow) {
    setDrawerMode("detail");
    setSelectedPeminjaman(item);
    setAlasanReject(item.alasan || "");
    setPageError("");
    setSuccessMessage("");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedPeminjaman(null);
    setForm(emptyForm);
    setAlasanReject("");
    setPageError("");
  }

  function handleFormChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPageError("");
    setSuccessMessage("");

    if (!form.ruangId) {
      setPageError("Pilih ruang terlebih dahulu.");
      return;
    }

    if (!form.tanggal) {
      setPageError("Tanggal peminjaman wajib diisi.");
      return;
    }

    if (!isValidScheduleRange(form.waktuMulai, form.waktuSelesai)) {
      setPageError("Waktu selesai harus lebih besar dari waktu mulai.");
      return;
    }

    if (!form.keperluan.trim()) {
      setPageError("Keperluan peminjaman wajib diisi.");
      return;
    }

    createMutation.mutate();
  }

  function handleReject() {
    if (!selectedPeminjaman) return;

    if (!alasanReject.trim()) {
      setPageError("Alasan penolakan wajib diisi.");
      return;
    }

    rejectMutation.mutate({
      id: selectedPeminjaman.id,
      alasan: alasanReject.trim()
    });
  }

  function handleToggleStatus(item: PeminjamanRow) {
    const nextStatus = item.status === "DIBATALKAN" ? "DIAJUKAN" : "DIBATALKAN";

    const confirmed = window.confirm(
      item.status === "DIBATALKAN"
        ? "Aktifkan kembali pengajuan peminjaman ini?"
        : "Batalkan peminjaman ruang ini? Data tetap tampil sebagai riwayat."
    );

    if (!confirmed) return;

    setPageError("");
    setSuccessMessage("");

    statusMutation.mutate({
      id: item.id,
      status: nextStatus
    });
  }

  function handleDeletePermanent(item: PeminjamanRow) {
    const confirmed = window.confirm(
      `Hapus permanen peminjaman ruang "${getRuangLabel(item)}"? Data yang sudah dihapus tidak dapat dikembalikan.`
    );

    if (!confirmed) return;

    setPageError("");
    setSuccessMessage("");

    deleteMutation.mutate(item.id);
  }

  const isLoading = canApprove
    ? allPeminjamanQuery.isLoading
    : myPeminjamanQuery.isLoading;

  const canReviewSelected =
    canApprove && selectedPeminjaman?.status === "DIAJUKAN";

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Ruang"
        title="Peminjaman Ruang"
        description="Ajukan peminjaman ruang dan kelola approval peminjaman ruang sidang."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !drawerMode ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card peminjaman-table-card">
        <DataTable
          data={filteredRows}
          isLoading={isLoading}
          emptyMessage="Belum ada data peminjaman ruang"
          toolbar={
            <FilterToolbar
              title={canApprove ? "Semua Peminjaman" : "Peminjaman Saya"}
              description="List peminjaman ruang, jadwal penggunaan, keperluan, dan status approval."
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Cari ruang, peminjam, keperluan..."
              action={
                canBorrow ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={openCreateDrawer}
                  >
                    Ajukan Peminjaman
                  </button>
                ) : null
              }
            >
              <div className="filter-field">
                <label>Status</label>
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
              </div>
            </FilterToolbar>
          }
          columns={[
              {
                key: "no",
                header: "No",
                align: "center",
                render: (_item, index) => index + 1
              },
              {
                key: "ruang",
                header: "Ruang",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{getRuangLabel(item)}</strong>
                    <span>{item.ruang?.type || "Ruang"}</span>
                  </div>
                )
              },
              {
                key: "peminjam",
                header: "Peminjam",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{getPeminjamLabel(item)}</strong>
                    <span>{item.mahasiswa?.identifier || "-"}</span>
                  </div>
                )
              },
              {
                key: "tanggal",
                header: "Tanggal",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{formatDateOnly(item.tanggal)}</strong>
                    <span>
                      {formatDateTime(item.waktuMulai)} -{" "}
                      {formatDateTime(item.waktuSelesai)}
                    </span>
                  </div>
                )
              },
              {
                key: "keperluan",
                header: "Keperluan",
                render: (item) => item.keperluan || "-"
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

                    {canApprove ? (
                      <button
                        type="button"
                        className={
                          item.status === "DIBATALKAN"
                            ? "primary-button"
                            : "danger-button"
                        }
                        disabled={statusMutation.isPending}
                        onClick={() => handleToggleStatus(item)}
                      >
                        {item.status === "DIBATALKAN" ? "Aktifkan" : "Batalkan"}
                      </button>
                    ) : null}

                    {canDeletePermanent ? (
                      <button
                        type="button"
                        className="danger-button"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDeletePermanent(item)}
                      >
                        Hapus Permanen
                      </button>
                    ) : null}
                  </div>
                )
              }
            ]}
          />

      </section>

      {drawerMode ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside
            className="crud-drawer peminjaman-drawer"
            aria-label="Peminjaman ruang"
          >
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">
                  {drawerMode === "create" ? "Tambah Data" : "Detail Data"}
                </p>
                <h2>
                  {drawerMode === "create"
                    ? "Ajukan Peminjaman"
                    : "Detail Peminjaman"}
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
                  <span>Ruang</span>
                  <select
                    name="ruangId"
                    value={form.ruangId}
                    onChange={handleFormChange}
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

                <label>
                  <span>Tanggal</span>
                  <input
                    name="tanggal"
                    type="date"
                    value={form.tanggal}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  <span>Waktu Mulai</span>
                  <input
                    name="waktuMulai"
                    type="datetime-local"
                    value={form.waktuMulai}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  <span>Waktu Selesai</span>
                  <input
                    name="waktuSelesai"
                    type="datetime-local"
                    value={form.waktuSelesai}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label>
                  <span>Keperluan</span>
                  <textarea
                    name="keperluan"
                    value={form.keperluan}
                    onChange={handleFormChange}
                    placeholder="Contoh: Sidang skripsi, rapat pembimbing, seminar proposal"
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? "Mengajukan..."
                    : "Ajukan Peminjaman"}
                </button>
              </form>
            ) : selectedPeminjaman ? (
              <div className="page-stack">
                <div className="workflow-history-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <p className="eyebrow" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                      {selectedPeminjaman.mahasiswa?.identifier || "admin"}
                    </p>
                    <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px", color: "var(--on-surface)" }}>
                      {getPeminjamLabel(selectedPeminjaman)}
                    </h2>
                    <p className="muted" style={{ color: "var(--on-surface-variant)", fontSize: "14px" }}>
                      {getRuangLabel(selectedPeminjaman)}
                    </p>
                  </div>

                  <div className="workflow-final-status" style={{ textAlign: "right" }}>
                    <StatusBadge value={selectedPeminjaman.status} size="md" />
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--on-surface-variant)", fontWeight: 600 }}>
                      Peminjaman Ruang
                    </div>
                  </div>
                </div>

                <div className="workflow-progress-track" style={{ height: "4px", backgroundColor: "var(--surface-container-high)", borderRadius: "4px", overflow: "hidden", marginBottom: "24px" }}>
                  <span style={{ display: "block", height: "100%", width: "100%", backgroundColor: "var(--primary)" }} />
                </div>

                <DataTable<any>
                  data={[
                    { label: "Tanggal", value: formatDateOnly(selectedPeminjaman.tanggal) },
                    { label: "Waktu Mulai", value: formatDateTime(selectedPeminjaman.waktuMulai) },
                    { label: "Waktu Selesai", value: formatDateTime(selectedPeminjaman.waktuSelesai) },
                    { label: "Keperluan", value: selectedPeminjaman.keperluan || "-" },
                    { label: "Alasan / Catatan", value: selectedPeminjaman.alasan || "-" },
                    { label: "Reviewer", value: selectedPeminjaman.reviewedBy?.name || "-" },
                    { label: "Reviewed At", value: formatDateTime(selectedPeminjaman.reviewedAt) }
                  ]}
                  columns={[
                    { key: "label", header: "Informasi", width: "30%", render: (item) => <strong>{item.label}</strong> },
                    { key: "value", header: "Detail", render: (item) => item.value }
                  ]}
                  compact
                  emptyMessage="Tidak ada data."
                  getRowKey={(item) => item.label}
                />

                {canReviewSelected ? (
                  <div className="drawer-section">
                    <h3>Approval Peminjaman</h3>

                    <label>
                      <span>Alasan Penolakan</span>
                      <textarea
                        value={alasanReject}
                        onChange={(event) => setAlasanReject(event.target.value)}
                        placeholder="Wajib diisi jika peminjaman ditolak"
                      />
                    </label>

                    <div className="page-actions">
                      <button
                        type="button"
                        className="primary-button"
                        disabled={approveMutation.isPending}
                        onClick={() =>
                          approveMutation.mutate(selectedPeminjaman.id)
                        }
                      >
                        Approve
                      </button>

                      <button
                        type="button"
                        className="danger-button"
                        disabled={rejectMutation.isPending}
                        onClick={handleReject}
                      >
                        Reject
                      </button>
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