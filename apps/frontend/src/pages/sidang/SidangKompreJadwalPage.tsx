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

const emptyForm = {
  ruangId: "",
  tanggal: "",
  waktuMulai: "",
  waktuSelesai: "",
  tempatManual: "",
  linkVicon: ""
};

function toIsoDate(value: string, fallbackDateTime?: string) {
  if (value) return new Date(`${value}T00:00:00`).toISOString();
  if (fallbackDateTime) return new Date(fallbackDateTime).toISOString();
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

export default function SidangKompreJadwalPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canReadSidang = hasPermission("sidang.read");
  const canManageSidang = hasPermission("sidang.manage");

  const [selectedSidang, setSelectedSidang] = useState<SidangItem | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sidangQuery = useQuery({
    queryKey: ["sidang", "kompre", "jadwal"],
    queryFn: () =>
      getSidangList({
        jenis: "SIDANG_KOMPRE",
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

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return sidangRows.filter((item) =>
      `${item.skripsi?.title ?? ""} ${item.skripsi?.mahasiswa?.name ?? ""} ${
        item.skripsi?.mahasiswa?.identifier ?? ""
      } ${item.status ?? ""} ${item.hasil ?? ""} ${getPengujiLabels(
        item
      )} ${getTempat(item)}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [sidangRows, search]);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedSidang) throw new Error("Sidang belum dipilih.");

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
          queryKey: ["sidang", "kompre", "jadwal"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "kompre", "penguji"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "kompre", "hasil"]
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
      setSuccessMessage("Jadwal Sidang Kompre berhasil dibuat.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal membuat jadwal Sidang Kompre. Pastikan penguji sudah lengkap dan ruang tidak bentrok."
        )
      );
    }
  });

  function openCreateDrawer(item: SidangItem) {
    setSelectedSidang(item);
    setForm(emptyForm);
    setPageError("");
    setSuccessMessage("");
  }

  function closeDrawer() {
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
          Anda tidak memiliki akses ke halaman jadwal Sidang Kompre.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Sidang Kompre"
        title="Jadwal Sidang Kompre"
        description="Buat jadwal Sidang Kompre berdasarkan sidangId setelah penguji ditetapkan."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !selectedSidang ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Daftar Sidang Kompre</h2>
            <p className="muted">
              Jadwal ini tersimpan di tabel jadwal sidang dengan relasi sidangId.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, mahasiswa, penguji, ruang..."
            />
          </div>
        </div>

        {sidangQuery.isLoading ? (
          <EmptyState
            title="Memuat jadwal Sidang Kompre..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRows}
            emptyMessage="Belum ada data Sidang Kompre"
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
                      {canManageSidang && !hasJadwal ? (
                        <button
                          type="button"
                          className="primary-button"
                          disabled={!hasPenguji}
                          onClick={() => openCreateDrawer(item)}
                        >
                          Buat Jadwal
                        </button>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </div>
                  );
                }
              }
            ]}
          />
        )}
      </section>

      {selectedSidang ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside
            className="crud-drawer jadwal-drawer"
            aria-label="Jadwal Sidang Kompre"
          >
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Sidang Kompre</p>
                <h2>Buat Jadwal Sidang Kompre</h2>
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
                <span>Penguji</span>
                <p>{getPengujiLabels(selectedSidang)}</p>
              </div>
            </div>

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
          </aside>
        </div>
      ) : null}
    </section>
  );
}