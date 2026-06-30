import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { getRuang } from "../../services/masterData";
import {
  createJadwalSidangWorkflow,
  getSidangList,
  type SidangItem
} from "../../services/sidang";
import { getApiErrorMessage } from "../../utils/apiError";

type DrawerMode = "create" | "detail" | null;

const emptyForm = {
  ruangId: "",
  tanggal: "",
  waktuMulai: "",
  waktuSelesai: "",
  tempatManual: "",
  linkVicon: ""
};

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

function getPengujiLabels(item: SidangItem) {
  const rows = item.dosen ?? [];

  if (rows.length === 0) return "-";

  return rows
    .map((row) => `${row.peran}: ${row.dosen?.name || row.dosenId}`)
    .join(", ");
}

function getLatestJadwal(item: SidangItem) {
  return item.jadwalSidang?.[0] ?? null;
}

function getTempat(item: SidangItem) {
  const jadwal = getLatestJadwal(item);

  if (!jadwal) return "-";

  const ruangLabel = `${jadwal.ruang?.code || ""} ${
    jadwal.ruang?.name || ""
  }`.trim();

  return ruangLabel || "-";
}

function isValidScheduleRange(waktuMulai: string, waktuSelesai: string) {
  if (!waktuMulai || !waktuSelesai) return false;

  return new Date(waktuSelesai).getTime() > new Date(waktuMulai).getTime();
}

export default function SeminarProposalJadwalPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canReadSidang = hasPermission("sidang.read");
  const canManageSidang = hasPermission("sidang.manage");

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedSidang, setSelectedSidang] = useState<SidangItem | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sidangQuery = useQuery({
    queryKey: ["sidang", "seminar-proposal", "jadwal"],
    queryFn: () =>
      getSidangList({
        jenis: "SEMINAR_PROPOSAL",
        limit: 100
      }),
    enabled: canReadSidang
  });

  const ruangQuery = useQuery({
    queryKey: ["ruang"],
    queryFn: () => getRuang(),
    enabled: canManageSidang
  });

  const sidangRows = sidangQuery.data?.data ?? [];
  const ruangRows = ruangQuery.data ?? [];

  const statusOptions = useMemo(() => {
    return Array.from(new Set(sidangRows.map((item) => item.status))).filter(
      Boolean
    );
  }, [sidangRows]);

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return sidangRows.filter((item) => {
      const jadwal = getLatestJadwal(item);

      const matchesSearch = `${item.skripsi?.title ?? ""} ${
        item.skripsi?.mahasiswa?.name ?? ""
      } ${item.skripsi?.mahasiswa?.identifier ?? ""} ${item.status ?? ""} ${
        item.hasil ?? ""
      } ${getPengujiLabels(item)} ${getTempat(item)}`
        .toLowerCase()
        .includes(keyword);

      const matchesStatus = statusFilter
        ? item.status === statusFilter || jadwal?.status === statusFilter
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [sidangRows, search, statusFilter]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedSidang) {
        throw new Error("Sidang belum dipilih.");
      }

      return createJadwalSidangWorkflow(selectedSidang.id, {
        ruangId: form.ruangId || null,
        tanggal: toIsoDate(form.tanggal, form.waktuMulai),
        waktuMulai: toIsoDateTime(form.waktuMulai),
        waktuSelesai: toIsoDateTime(form.waktuSelesai),
        tempatManual: form.tempatManual.trim() || null,
        linkVicon: form.linkVicon.trim() || null
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-proposal", "jadwal"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-proposal"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["jadwal-sidang"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-summary"]
        })
      ]);

      closeDrawer();
      setPageError("");
      setSuccessMessage("Jadwal seminar proposal berhasil dibuat.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal membuat jadwal. Pastikan penguji sudah memenuhi aturan workflow dan ruang tidak bentrok."
        )
      );
    }
  });

  function openCreateDrawer(item: SidangItem) {
    setDrawerMode("create");
    setSelectedSidang(item);
    setForm(emptyForm);
    setPageError("");
    setSuccessMessage("");
  }

  function openDetailDrawer(item: SidangItem) {
    setDrawerMode("detail");
    setSelectedSidang(item);
    setForm(emptyForm);
    setPageError("");
    setSuccessMessage("");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedSidang(null);
    setForm(emptyForm);
    setPageError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPageError("");
    setSuccessMessage("");

    if (!selectedSidang) {
      setPageError("Sidang belum dipilih.");
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

  if (!canReadSidang) {
    return (
      <section className="page-stack">
        <div className="alert-error">
          Anda tidak memiliki akses ke halaman jadwal seminar proposal.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Workflow Sidang"
        title="Jadwal Seminar Proposal"
        description="Buat jadwal seminar proposal berdasarkan attempt sidang yang sudah memiliki penguji."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !drawerMode ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Daftar Seminar Proposal</h2>
            <p className="muted">
              Jadwal dibuat berbasis workflow sidang baru tanpa mengubah halaman
              jadwal sidang lama.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, mahasiswa, penguji, ruang..."
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
          </div>
        </div>

        {sidangQuery.isLoading ? (
          <EmptyState
            title="Memuat jadwal seminar proposal..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRows}
            emptyMessage="Belum ada data seminar proposal"
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
                      {item.skripsi?.mahasiswa?.name || "-"} •{" "}
                      {item.skripsi?.mahasiswa?.identifier || "-"}
                    </span>
                  </div>
                )
              },
              {
                key: "attempt",
                header: "Attempt",
                align: "center",
                render: (item) => item.attemptNo
              },
              {
                key: "penguji",
                header: "Penguji",
                render: (item) => getPengujiLabels(item)
              },
              {
                key: "jadwal",
                header: "Jadwal",
                render: (item) => {
                  const jadwal = getLatestJadwal(item);

                  return (
                    <div className="table-title-cell">
                      <strong>{formatDateTime(jadwal?.waktuMulai)}</strong>
                      <span>{getTempat(item)}</span>
                    </div>
                  );
                }
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
                align: "center",
                render: (item) =>
                  item.hasil ? (
                    <StatusBadge value={item.hasil} size="sm" />
                  ) : (
                    <span className="muted">-</span>
                  )
              },
              {
                key: "actions",
                header: "Aksi",
                align: "right",
                render: (item) => {
                  const hasJadwal = Boolean(getLatestJadwal(item));
                  const hasPenguji = Boolean(item.dosen?.length);

                  return (
                    <div className="table-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => openDetailDrawer(item)}
                      >
                        Detail
                      </button>

                      {canManageSidang && !hasJadwal ? (
                        <button
                          type="button"
                          className="primary-button"
                          disabled={!hasPenguji}
                          onClick={() => openCreateDrawer(item)}
                        >
                          Buat Jadwal
                        </button>
                      ) : null}
                    </div>
                  );
                }
              }
            ]}
          />
        )}
      </section>

      {drawerMode && selectedSidang ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside className="crud-drawer jadwal-drawer" aria-label="Jadwal sempro">
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Seminar Proposal</p>
                <h2>
                  {drawerMode === "create"
                    ? "Buat Jadwal Seminar Proposal"
                    : "Detail Seminar Proposal"}
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

            <div className="info-list">
              <div className="info-row">
                <span>Judul</span>
                <strong>{selectedSidang.skripsi?.title || "Tanpa judul"}</strong>
              </div>

              <div className="info-row">
                <span>Mahasiswa</span>
                <strong>{selectedSidang.skripsi?.mahasiswa?.name || "-"}</strong>
              </div>

              <div className="info-row">
                <span>Attempt</span>
                <strong>{selectedSidang.attemptNo}</strong>
              </div>

              <div className="info-row">
                <span>Status</span>
                <StatusBadge value={selectedSidang.status} size="sm" />
              </div>

              <div className="info-row">
                <span>Penguji</span>
                <p>{getPengujiLabels(selectedSidang)}</p>
              </div>
            </div>

            {drawerMode === "create" ? (
              <form className="form-stack" onSubmit={handleSubmit}>
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
            ) : (
              <div className="drawer-section">
                <h3>Jadwal</h3>

                {selectedSidang.jadwalSidang?.length ? (
                  <div className="info-list">
                    {selectedSidang.jadwalSidang.map((jadwal) => (
                      <div key={jadwal.id} className="info-row">
                        <span>{formatDateTime(jadwal.waktuMulai)}</span>
                        <strong>
                          {`${jadwal.ruang?.code || ""} ${
                            jadwal.ruang?.name || ""
                          }`.trim() || "-"}
                        </strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Belum ada jadwal.</p>
                )}
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}