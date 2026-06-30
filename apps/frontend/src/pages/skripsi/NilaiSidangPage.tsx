import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import MetricCard from "../../components/ui/MetricCard";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  deleteNilaiSidangPermanent,
  finalizeNilaiSidang,
  getNilaiSidang,
  inputNilaiSidang
} from "../../services/nilaiSidang";
import { getSkripsiList } from "../../services/skripsi";
import type { NilaiSidangItem } from "../../types/finalisasi";
import type { SkripsiSummary } from "../../types/skripsi";
import { getApiErrorMessage } from "../../utils/apiError";

type DrawerMode = "input" | "detail" | null;

const emptyForm = {
  komponen: "presentasi",
  nilai: "85",
  bobot: "40",
  catatan: ""
};

const komponenOptions = [
  {
    value: "presentasi",
    label: "Presentasi"
  },
  {
    value: "substansi",
    label: "Substansi"
  },
  {
    value: "metodologi",
    label: "Metodologi"
  },
  {
    value: "tanya_jawab",
    label: "Tanya Jawab"
  },
  {
    value: "naskah",
    label: "Naskah"
  }
];

function formatNumber(value?: string | number | null) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) return "0";

  return numberValue.toFixed(2);
}

function formatKomponen(value: string) {
  return (
    komponenOptions.find((item) => item.value === value)?.label ||
    value.replaceAll("_", " ")
  );
}

export default function NilaiSidangPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canInput = hasPermission("nilai.input");

  const canDeletePermanent = hasPermission("nilai.delete_permanent");

  const [selectedSkripsiId, setSelectedSkripsiId] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedNilai, setSelectedNilai] = useState<NilaiSidangItem | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const skripsiQuery = useQuery({
    queryKey: ["skripsi-list-for-nilai"],
    queryFn: () =>
      getSkripsiList({
        limit: 100
      })
  });

  const skripsiOptions: SkripsiSummary[] = useMemo(() => {
    const rows = skripsiQuery.data?.data ?? [];

    return rows.filter((item) =>
      [
        "SIAP_SIDANG",
        "DIJADWALKAN",
        "BERLANGSUNG",
        "EVALUASI_SIDANG",
        "MENUNGGU_REVISI",
        "MENUNGGU_FINAL",
        "MENUNGGU_PENGESAHAN",
        "SELESAI"
      ].includes(item.status)
    );
  }, [skripsiQuery.data]);

  useEffect(() => {
    if (!selectedSkripsiId && skripsiOptions.length > 0) {
      setSelectedSkripsiId(skripsiOptions[0].id);
    }
  }, [selectedSkripsiId, skripsiOptions]);

  const selectedSkripsi = skripsiOptions.find(
    (item) => item.id === selectedSkripsiId
  );

  const nilaiQuery = useQuery({
    queryKey: ["nilai-sidang", selectedSkripsiId],
    queryFn: () => getNilaiSidang(selectedSkripsiId),
    enabled: Boolean(selectedSkripsiId)
  });

  const rows: NilaiSidangItem[] = nilaiQuery.data?.rows ?? [];
  const summary = nilaiQuery.data?.summary;

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return rows.filter((item) =>
      `${item.komponen} ${item.nilai} ${item.bobot} ${
        item.catatan ?? ""
      } ${item.dosen?.name ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [rows, search]);

  const inputMutation = useMutation({
    mutationFn: () =>
      inputNilaiSidang(selectedSkripsiId, {
        komponen: form.komponen,
        nilai: Number(form.nilai),
        bobot: Number(form.bobot),
        catatan: form.catatan.trim() || undefined
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["nilai-sidang", selectedSkripsiId]
        }),
        queryClient.invalidateQueries({
          queryKey: ["nilai-sidang"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["skripsi-list-for-nilai"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-summary"]
        })
      ]);

      await queryClient.refetchQueries({
        queryKey: ["nilai-sidang", selectedSkripsiId],
        exact: true
      });

      setForm(emptyForm);
      closeDrawer();
      setPageError("");
      setSuccessMessage("Nilai sidang berhasil disimpan dan daftar nilai diperbarui.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal menyimpan nilai. Pastikan Anda dosen pembimbing/penguji yang ter-assign pada skripsi ini."
        )
      );
    }
  });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeNilaiSidang(selectedSkripsiId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["nilai-sidang", selectedSkripsiId]
        }),
        queryClient.invalidateQueries({
          queryKey: ["nilai-sidang"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["skripsi-list-for-nilai"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["my-skripsi"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-summary"]
        })
      ]);

      await queryClient.refetchQueries({
        queryKey: ["nilai-sidang", selectedSkripsiId],
        exact: true
      });

      setPageError("");
      setSuccessMessage("Nilai sidang berhasil difinalisasi.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal finalize nilai. Pastikan minimal satu nilai sudah diinput."
        )
      );
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (nilaiId: string) => deleteNilaiSidangPermanent(nilaiId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["nilai-sidang", selectedSkripsiId]
        }),
        queryClient.invalidateQueries({
          queryKey: ["nilai-sidang"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["skripsi-list-for-nilai"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-summary"]
        })
      ]);

      await queryClient.refetchQueries({
        queryKey: ["nilai-sidang", selectedSkripsiId],
        exact: true
      });

      closeDrawer();
      setPageError("");
      setSuccessMessage("Nilai sidang berhasil dihapus permanen.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal menghapus nilai. Nilai pada skripsi yang sudah selesai tidak dapat dihapus."
        )
      );
    }
  });

  function openInputDrawer() {
    setDrawerMode("input");
    setSelectedNilai(null);
    setForm(emptyForm);
    setPageError("");
    setSuccessMessage("");
  }

  function openDetailDrawer(item: NilaiSidangItem) {
    setDrawerMode("detail");
    setSelectedNilai(item);
    setPageError("");
    setSuccessMessage("");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedNilai(null);
    setForm(emptyForm);
    setPageError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPageError("");
    setSuccessMessage("");

    const nilai = Number(form.nilai);
    const bobot = Number(form.bobot);

    if (!selectedSkripsiId) {
      setPageError("Pilih skripsi terlebih dahulu.");
      return;
    }

    if (Number.isNaN(nilai) || nilai < 0 || nilai > 100) {
      setPageError("Nilai harus berada pada rentang 0 sampai 100.");
      return;
    }

    if (Number.isNaN(bobot) || bobot <= 0) {
      setPageError("Bobot harus lebih dari 0.");
      return;
    }

    inputMutation.mutate();
  }

  function handleDeleteNilai(item: NilaiSidangItem) {
    const confirmed = window.confirm(
      `Hapus permanen nilai komponen "${formatKomponen(item.komponen)}"? Data yang sudah dihapus tidak dapat dikembalikan.`
    );

    if (!confirmed) return;

    setPageError("");
    setSuccessMessage("");
    deleteMutation.mutate(item.id);
  }

  const totalNilai = rows.length;
  const totalBobot = summary?.totalBobot ?? 0;
  const nilaiAkhir = summary?.nilaiAkhir ?? 0;
  const nilaiHuruf = summary?.nilaiHuruf || "-";

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Sidang"
        title="Nilai Sidang"
        description="Input komponen nilai sidang, bobot nilai, dan finalisasi nilai akhir mahasiswa."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !drawerMode ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card nilai-summary-card">
        <div className="nilai-selector-row">
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
                <option value="">Belum ada skripsi siap dinilai</option>
              ) : (
                skripsiOptions.map((skripsi) => (
                  <option key={skripsi.id} value={skripsi.id}>
                    {skripsi.title || "Tanpa judul"} —{" "}
                    {skripsi.mahasiswa?.name || skripsi.mahasiswaId} —{" "}
                    {skripsi.status}
                  </option>
                ))
              )}
            </select>
          </label>

          {selectedSkripsi ? (
            <div className="nilai-selected-info">
              <strong>{selectedSkripsi.title || "Tanpa judul"}</strong>
              <span>
                {selectedSkripsi.mahasiswa?.name || "-"} •{" "}
                {selectedSkripsi.tahap} • {selectedSkripsi.status}
              </span>
            </div>
          ) : null}
        </div>

        <div className="metric-grid">
          <MetricCard
            label="Nilai Akhir"
            value={formatNumber(nilaiAkhir)}
            description="Hasil kalkulasi nilai sidang"
          />
          <MetricCard
            label="Nilai Huruf"
            value={nilaiHuruf}
            description="Konversi nilai akhir"
          />
          <MetricCard
            label="Total Bobot"
            value={formatNumber(totalBobot)}
            description="Akumulasi bobot nilai"
          />
          <MetricCard
            label="Komponen"
            value={totalNilai}
            description="Jumlah komponen nilai"
          />
        </div>
      </section>

      <section className="list-card nilai-table-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Rekap Nilai</h2>
            <p className="muted">
              List komponen nilai, dosen penilai, bobot, dan catatan penilaian.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari komponen, dosen, atau catatan..."
            />

            {canInput && selectedSkripsiId ? (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => finalizeMutation.mutate()}
                  disabled={finalizeMutation.isPending || rows.length === 0}
                >
                  {finalizeMutation.isPending
                    ? "Finalizing..."
                    : "Finalize Nilai"}
                </button>

                <button
                  type="button"
                  className="primary-button"
                  onClick={openInputDrawer}
                >
                  Input Nilai
                </button>
              </>
            ) : null}
          </div>
        </div>

        {!selectedSkripsiId ? (
          <EmptyState
            title="Belum ada skripsi"
            description="Pilih skripsi terlebih dahulu untuk melihat nilai."
          />
        ) : nilaiQuery.isLoading ? (
          <EmptyState
            title="Memuat nilai..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRows}
            emptyMessage="Belum ada nilai"
            columns={[
              {
                key: "no",
                header: "No",
                align: "center",
                render: (_item, index) => index + 1
              },
              {
                key: "komponen",
                header: "Komponen",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{formatKomponen(item.komponen)}</strong>
                    <span>{item.catatan || "Tidak ada catatan"}</span>
                  </div>
                )
              },
              {
                key: "dosen",
                header: "Dosen Penilai",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.dosen?.name || item.dosenId}</strong>
                    <span>{item.dosen?.identifier || "-"}</span>
                  </div>
                )
              },
              {
                key: "nilai",
                header: "Nilai",
                align: "center",
                render: (item) => (
                  <div className="score-box table-score-box">
                    <strong>{formatNumber(item.nilai)}</strong>
                    <small>Bobot {formatNumber(item.bobot)}</small>
                  </div>
                )
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: () => <StatusBadge value="TERINPUT" size="sm" />
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

                    {canDeletePermanent ? (
                      <button
                        type="button"
                        className="danger-button"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDeleteNilai(item)}
                      >
                        Hapus Permanen
                      </button>
                    ) : null}
                  </div>
                )
              }
            ]}
          />
        )}
      </section>

      {drawerMode ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside className="crud-drawer nilai-drawer" aria-label="Form nilai">
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">
                  {drawerMode === "input" ? "Tambah Data" : "Detail Data"}
                </p>
                <h2>
                  {drawerMode === "input" ? "Input Nilai" : "Detail Nilai"}
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

            {drawerMode === "input" ? (
              <form className="form-stack" onSubmit={handleSubmit}>
                <label>
                  <span>Komponen</span>
                  <select
                    value={form.komponen}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        komponen: event.target.value
                      }))
                    }
                  >
                    {komponenOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Nilai</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.nilai}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nilai: event.target.value
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Bobot</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.bobot}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        bobot: event.target.value
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Catatan</span>
                  <textarea
                    value={form.catatan}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        catatan: event.target.value
                      }))
                    }
                    placeholder="Catatan penilaian"
                  />
                </label>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={inputMutation.isPending}
                >
                  {inputMutation.isPending ? "Menyimpan..." : "Simpan Nilai"}
                </button>
              </form>
            ) : selectedNilai ? (
              <div className="nilai-detail-stack">
                <div className="skripsi-detail-title">
                  <strong>{formatKomponen(selectedNilai.komponen)}</strong>
                  <StatusBadge value="TERINPUT" />
                </div>

                <div className="info-list">
                  <div className="info-row">
                    <span>Dosen Penilai</span>
                    <strong>
                      {selectedNilai.dosen?.name || selectedNilai.dosenId}
                    </strong>
                  </div>

                  {canDeletePermanent ? (
                    <div className="drawer-section danger-zone">
                      <h3>Hapus Permanen</h3>
                      <p className="muted">
                        Gunakan hanya untuk menghapus nilai yang salah input. Nilai pada skripsi
                        yang sudah selesai tidak dapat dihapus.
                      </p>

                      <button
                        type="button"
                        className="danger-button"
                        disabled={deleteMutation.isPending}
                        onClick={() => handleDeleteNilai(selectedNilai)}
                      >
                        {deleteMutation.isPending ? "Menghapus..." : "Hapus Permanen Nilai"}
                      </button>
                    </div>
                  ) : null}
                  
                  <div className="info-row">
                    <span>Identifier Dosen</span>
                    <strong>{selectedNilai.dosen?.identifier || "-"}</strong>
                  </div>

                  <div className="info-row">
                    <span>Nilai</span>
                    <strong>{formatNumber(selectedNilai.nilai)}</strong>
                  </div>

                  <div className="info-row">
                    <span>Bobot</span>
                    <strong>{formatNumber(selectedNilai.bobot)}</strong>
                  </div>

                  <div className="info-row">
                    <span>Catatan</span>
                    <p>{selectedNilai.catatan || "-"}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}