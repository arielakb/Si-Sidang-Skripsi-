import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  getSidangList,
  inputHasilSidang,
  type SidangHasil,
  type SidangItem
} from "../../services/sidang";
import { getApiErrorMessage } from "../../utils/apiError";

type DrawerMode = "hasil" | "detail" | null;

const hasilOptions: SidangHasil[] = ["LOLOS", "TIDAK_LOLOS", "REVISI", "ULANG"];

const emptyForm = {
  hasil: "LOLOS" as SidangHasil,
  catatanHasil: ""
};

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

function getJadwalLabel(item: SidangItem) {
  const jadwal = getLatestJadwal(item);

  if (!jadwal) return "-";

  const ruang = `${jadwal.ruang?.code || ""} ${jadwal.ruang?.name || ""}`.trim();

  return `${formatDateTime(jadwal.waktuMulai)} • ${ruang || "Tempat manual / online"}`;
}

export default function SeminarProposalHasilPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canReadSidang = hasPermission("sidang.read");
  const canInputHasil = hasPermission("sidang.input_hasil");

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedSidang, setSelectedSidang] = useState<SidangItem | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sidangQuery = useQuery({
    queryKey: ["sidang", "seminar-proposal", "hasil"],
    queryFn: () =>
      getSidangList({
        jenis: "SEMINAR_PROPOSAL",
        limit: 100
      }),
    enabled: canReadSidang
  });

  const sidangRows = sidangQuery.data?.data ?? [];

  const statusOptions = useMemo(() => {
    return Array.from(new Set(sidangRows.map((item) => item.status))).filter(
      Boolean
    );
  }, [sidangRows]);

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return sidangRows.filter((item) => {
      const matchesSearch = `${item.skripsi?.title ?? ""} ${
        item.skripsi?.mahasiswa?.name ?? ""
      } ${item.skripsi?.mahasiswa?.identifier ?? ""} ${item.status ?? ""} ${
        item.hasil ?? ""
      } ${item.catatanHasil ?? ""} ${getPengujiLabels(item)} ${getJadwalLabel(item)}`
        .toLowerCase()
        .includes(keyword);

      const matchesStatus = statusFilter ? item.status === statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }, [sidangRows, search, statusFilter]);

  const hasilMutation = useMutation({
    mutationFn: () => {
      if (!selectedSidang) {
        throw new Error("Sidang belum dipilih.");
      }

      return inputHasilSidang(selectedSidang.id, {
        hasil: form.hasil,
        catatanHasil: form.catatanHasil.trim() || undefined
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-proposal", "hasil"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-proposal"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["skripsi"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["my-skripsi"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-summary"]
        })
      ]);

      closeDrawer();
      setPageError("");
      setSuccessMessage("Hasil seminar proposal berhasil disimpan.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal menyimpan hasil. Pastikan Anda dosen penguji aktif pada sidang ini."
        )
      );
    }
  });

  function openHasilDrawer(item: SidangItem) {
    setDrawerMode("hasil");
    setSelectedSidang(item);
    setForm({
      hasil: item.hasil || "LOLOS",
      catatanHasil: item.catatanHasil || ""
    });
    setPageError("");
    setSuccessMessage("");
  }

  function openDetailDrawer(item: SidangItem) {
    setDrawerMode("detail");
    setSelectedSidang(item);
    setForm({
      hasil: item.hasil || "LOLOS",
      catatanHasil: item.catatanHasil || ""
    });
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

    if (["TIDAK_LOLOS", "REVISI", "ULANG"].includes(form.hasil)) {
      if (!form.catatanHasil.trim()) {
        setPageError("Catatan wajib diisi untuk hasil tidak lolos, revisi, atau ulang.");
        return;
      }
    }

    hasilMutation.mutate();
  }

  if (!canReadSidang) {
    return (
      <section className="page-stack">
        <div className="alert-error">
          Anda tidak memiliki akses ke halaman hasil seminar proposal.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Workflow Sidang"
        title="Hasil Seminar Proposal"
        description="Dosen penguji mengisi hasil seminar proposal dan catatan untuk mahasiswa."
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
            <h2>Daftar Hasil Seminar Proposal</h2>
            <p className="muted">
              Hasil LOLOS akan melanjutkan skripsi ke tahap menunggu assign pembimbing.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, mahasiswa, penguji, hasil..."
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
            title="Memuat hasil seminar proposal..."
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
                key: "jadwal",
                header: "Jadwal",
                render: (item) => getJadwalLabel(item)
              },
              {
                key: "penguji",
                header: "Penguji",
                render: (item) => getPengujiLabels(item)
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
                  const alreadyDone = item.status === "SELESAI";

                  return (
                    <div className="table-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => openDetailDrawer(item)}
                      >
                        Detail
                      </button>

                      {canInputHasil ? (
                        <button
                          type="button"
                          className={alreadyDone ? "secondary-button" : "primary-button"}
                          disabled={!hasJadwal}
                          onClick={() => openHasilDrawer(item)}
                        >
                          {alreadyDone ? "Ubah Hasil" : "Input Hasil"}
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
          <aside className="crud-drawer" aria-label="Hasil seminar proposal">
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Seminar Proposal</p>
                <h2>
                  {drawerMode === "hasil"
                    ? "Input Hasil Seminar Proposal"
                    : "Detail Hasil Seminar Proposal"}
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
                <span>Jadwal</span>
                <p>{getJadwalLabel(selectedSidang)}</p>
              </div>

              <div className="info-row">
                <span>Penguji</span>
                <p>{getPengujiLabels(selectedSidang)}</p>
              </div>

              <div className="info-row">
                <span>Status</span>
                <StatusBadge value={selectedSidang.status} size="sm" />
              </div>
            </div>

            {drawerMode === "hasil" ? (
              <form className="form-stack" onSubmit={handleSubmit}>
                <label>
                  <span>Hasil Seminar Proposal</span>
                  <select
                    value={form.hasil}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        hasil: event.target.value as SidangHasil
                      }))
                    }
                  >
                    {hasilOptions.map((hasil) => (
                      <option key={hasil} value={hasil}>
                        {hasil}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Catatan Hasil</span>
                  <textarea
                    value={form.catatanHasil}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        catatanHasil: event.target.value
                      }))
                    }
                    placeholder="Catatan hasil seminar, alasan tidak lolos, atau arahan revisi."
                  />
                </label>

                <div className="page-actions">
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={hasilMutation.isPending}
                  >
                    {hasilMutation.isPending ? "Menyimpan..." : "Simpan Hasil"}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={closeDrawer}
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <div className="drawer-section">
                <h3>Hasil</h3>

                <div className="info-list">
                  <div className="info-row">
                    <span>Hasil</span>
                    {selectedSidang.hasil ? (
                      <StatusBadge value={selectedSidang.hasil} size="sm" />
                    ) : (
                      <strong>-</strong>
                    )}
                  </div>

                  <div className="info-row">
                    <span>Catatan</span>
                    <p>{selectedSidang.catatanHasil || "-"}</p>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}