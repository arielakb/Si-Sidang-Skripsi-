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

  return `${formatDateTime(jadwal.waktuMulai)} • ${
    ruang || "Tempat manual / online"
  }`;
}

export default function SidangKompreHasilPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canReadSidang = hasPermission("sidang.read");
  const canInputHasil = hasPermission("sidang.input_hasil");

  const [selectedSidang, setSelectedSidang] = useState<SidangItem | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sidangQuery = useQuery({
    queryKey: ["sidang", "kompre", "hasil"],
    queryFn: () =>
      getSidangList({
        jenis: "SIDANG_KOMPRE",
        limit: 100
      }),
    enabled: canReadSidang
  });

  const sidangRows = sidangQuery.data?.data ?? [];

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return sidangRows.filter((item) =>
      `${item.skripsi?.title ?? ""} ${item.skripsi?.mahasiswa?.name ?? ""} ${
        item.skripsi?.mahasiswa?.identifier ?? ""
      } ${item.status ?? ""} ${item.hasil ?? ""} ${item.catatanHasil ?? ""} ${
        getPengujiLabels(item)
      } ${getJadwalLabel(item)}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [sidangRows, search]);

  const hasilMutation = useMutation({
    mutationFn: () => {
      if (!selectedSidang) throw new Error("Sidang belum dipilih.");

      return inputHasilSidang(selectedSidang.id, {
        hasil: form.hasil,
        catatanHasil: form.catatanHasil.trim() || undefined
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sidang", "kompre", "hasil"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "kompre", "jadwal"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "kompre", "penguji"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "sidang-akhir", "jadwal"]
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
      setSuccessMessage(
        "Hasil Sidang Kompre berhasil disimpan. Jika LOLOS, sistem akan menyiapkan Sidang Akhir."
      );
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal menyimpan hasil Sidang Kompre. Pastikan Anda penguji aktif pada sidang ini."
        )
      );
    }
  });

  function openHasilDrawer(item: SidangItem) {
    setSelectedSidang(item);
    setForm({
      hasil: item.hasil || "LOLOS",
      catatanHasil: item.catatanHasil || ""
    });
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

    if (["TIDAK_LOLOS", "REVISI", "ULANG"].includes(form.hasil)) {
      if (!form.catatanHasil.trim()) {
        setPageError(
          "Catatan wajib diisi untuk hasil tidak lolos, revisi, atau ulang."
        );
        return;
      }
    }

    hasilMutation.mutate();
  }

  if (!canReadSidang) {
    return (
      <section className="page-stack">
        <div className="alert-error">
          Anda tidak memiliki akses ke halaman hasil Sidang Kompre.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Sidang Kompre"
        title="Hasil Sidang Kompre"
        description="Dosen penguji mengisi hasil Sidang Kompre. Jika LOLOS, sistem membuat Sidang Akhir."
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
            <h2>Daftar Hasil Sidang Kompre</h2>
            <p className="muted">
              Hasil LOLOS akan melanjutkan skripsi ke tahap Sidang Akhir.
              Hasil TIDAK_LOLOS atau ULANG akan membuat attempt Kompre berikutnya
              jika batas percobaan masih tersedia.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, mahasiswa, penguji, hasil..."
            />
          </div>
        </div>

        {sidangQuery.isLoading ? (
          <EmptyState
            title="Memuat hasil Sidang Kompre..."
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

                  return (
                    <div className="table-actions">
                      {canInputHasil ? (
                        <button
                          type="button"
                          className={
                            item.status === "SELESAI"
                              ? "secondary-button"
                              : "primary-button"
                          }
                          disabled={!hasJadwal}
                          onClick={() => openHasilDrawer(item)}
                        >
                          {item.status === "SELESAI"
                            ? "Ubah Hasil"
                            : "Input Hasil"}
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
          <aside className="crud-drawer" aria-label="Hasil Sidang Kompre">
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Sidang Kompre</p>
                <h2>Input Hasil Sidang Kompre</h2>
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
                <span>Jadwal</span>
                <p>{getJadwalLabel(selectedSidang)}</p>
              </div>

              <div className="info-row">
                <span>Penguji</span>
                <p>{getPengujiLabels(selectedSidang)}</p>
              </div>
            </div>

            <form className="form-stack" onSubmit={handleSubmit}>
              <label>
                <span>Hasil Sidang Kompre</span>
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
                <span>Catatan / Revisi</span>
                <textarea
                  value={form.catatanHasil}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      catatanHasil: event.target.value
                    }))
                  }
                  placeholder="Catatan hasil Kompre, revisi, alasan tidak lolos, atau arahan menuju Sidang Akhir."
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
          </aside>
        </div>
      ) : null}
    </section>
  );
}