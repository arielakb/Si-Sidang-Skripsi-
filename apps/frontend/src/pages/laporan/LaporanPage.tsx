import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import MetricCard from "../../components/ui/MetricCard";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  downloadLaporanSkripsiExcel,
  downloadLaporanSkripsiPdf,
  getLaporanSkripsi,
  getLaporanSummary,
  type LaporanFilter,
  type LaporanSkripsiRow
} from "../../services/laporan";
import { getPeminatan } from "../../services/masterData";

type DrawerMode = "detail" | null;

const statusOptions = [
  "MENUNGGU_BERKAS",
  "MENUNGGU_APPROVAL",
  "MENUNGGU_JADWAL",
  "SIAP_SIDANG",
  "EVALUASI_SIDANG",
  "MENUNGGU_REVISI",
  "MENUNGGU_FINAL",
  "MENUNGGU_PENGESAHAN",
  "SELESAI",
  "DITOLAK"
];

const tahapOptions = [
  "SEMINAR_PROPOSAL",
  "KOMPRE",
  "SIDANG_SKRIPSI",
  "FINAL"
];

const initialFilters: LaporanFilter = {
  status: "",
  tahap: "",
  peminatanId: "",
  search: "",
  startDate: "",
  endDate: "",
  page: 1,
  limit: 20
};

function cleanFilters(filters: LaporanFilter): LaporanFilter {
  return {
    ...filters,
    status: filters.status || undefined,
    tahap: filters.tahap || undefined,
    peminatanId: filters.peminatanId || undefined,
    search: filters.search || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getCardValue(cards: Record<string, number> | undefined, keys: string[]) {
  if (!cards) return 0;

  for (const key of keys) {
    if (typeof cards[key] === "number") return cards[key];
  }

  return 0;
}

export default function LaporanPage() {
  const [filters, setFilters] = useState<LaporanFilter>(initialFilters);
  const [isExporting, setIsExporting] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedRow, setSelectedRow] = useState<LaporanSkripsiRow | null>(null);

  const apiFilters = useMemo(() => cleanFilters(filters), [filters]);

  const summaryQuery = useQuery({
    queryKey: ["laporan-summary"],
    queryFn: getLaporanSummary
  });

  const peminatanQuery = useQuery({
    queryKey: ["peminatan"],
    queryFn: () => getPeminatan()
  });
  const laporanQuery = useQuery({
    queryKey: ["laporan-skripsi", apiFilters],
    queryFn: () => getLaporanSkripsi(apiFilters)
  });

  const summary = summaryQuery.data;
  const rows = laporanQuery.data?.data ?? [];
  const meta = laporanQuery.data?.meta;

  const totalSkripsi =
    getCardValue(summary?.cards, ["total", "totalSkripsi", "skripsi"]) ||
    (summary?.byStatus ?? []).reduce((total, item) => total + item.count, 0);

  const totalSelesai =
    summary?.byStatus.find((item) => item.status === "SELESAI")?.count ?? 0;

  const totalRevisi =
    summary?.byStatus.find((item) => item.status === "MENUNGGU_REVISI")?.count ??
    0;

  const totalFinalisasi =
    (summary?.byStatus.find((item) => item.status === "MENUNGGU_FINAL")?.count ??
      0) +
    (summary?.byStatus.find((item) => item.status === "MENUNGGU_PENGESAHAN")
      ?.count ?? 0);

  function updateFilter<K extends keyof LaporanFilter>(
    key: K,
    value: LaporanFilter[K]
  ) {
    setFilters((current) => {
      const next = {
        ...current,
        [key]: value
      } as LaporanFilter;

      next.page = key === "page" ? Number(value ?? 1) : 1;

      return next;
    });
  }

  async function handleExportExcel() {
    setIsExporting("excel");

    try {
      await downloadLaporanSkripsiExcel(apiFilters);
    } finally {
      setIsExporting("");
    }
  }

  async function handleExportPdf() {
    setIsExporting("pdf");

    try {
      await downloadLaporanSkripsiPdf(apiFilters);
    } finally {
      setIsExporting("");
    }
  }

  function openDetailDrawer(row: LaporanSkripsiRow) {
    setSelectedRow(row);
    setDrawerMode("detail");
  }

  function closeDrawer() {
    setSelectedRow(null);
    setDrawerMode(null);
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Laporan"
        title="Analytics & Laporan Skripsi"
        description="Pantau progres skripsi, distribusi status, dan export laporan akademik."
      />

      <div className="metric-grid laporan-overview-grid">
        <MetricCard
          label="Total Skripsi"
          value={totalSkripsi}
          description="Total data skripsi tercatat"
        />

        <MetricCard
          label="Selesai"
          value={totalSelesai}
          description="Skripsi yang sudah selesai"
        />

        <MetricCard
          label="Menunggu Revisi"
          value={totalRevisi}
          description="Skripsi yang masih revisi"
        />

        <MetricCard
          label="Finalisasi"
          value={totalFinalisasi}
          description="Menunggu final/pengesahan"
        />
      </div>

      {summary ? (
        <section className="laporan-distribution-grid">
          <div className="list-card laporan-mini-card">
            <h2>Distribusi Status</h2>

            <div className="mini-report-list">
              {summary.byStatus.map((item) => (
                <div key={item.status} className="mini-report-row">
                  <StatusBadge value={item.status} size="sm" />
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="list-card laporan-mini-card">
            <h2>Distribusi Tahap</h2>

            <div className="mini-report-list">
              {summary.byTahap.map((item) => (
                <div key={item.tahap} className="mini-report-row">
                  <StatusBadge value={item.tahap} size="sm" />
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="list-card laporan-table-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Data Skripsi</h2>
            <p className="muted">
              Total: {meta?.total ?? 0} data • Halaman {meta?.page ?? 1}/
              {meta?.totalPages ?? 1}
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={filters.search ?? ""}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Cari nama, NPM, atau judul..."
            />

            <select
              value={filters.status ?? ""}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="">Semua Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              value={filters.tahap ?? ""}
              onChange={(event) => updateFilter("tahap", event.target.value)}
            >
              <option value="">Semua Tahap</option>
              {tahapOptions.map((tahap) => (
                <option key={tahap} value={tahap}>
                  {tahap}
                </option>
              ))}
            </select>

            <select
              value={filters.peminatanId ?? ""}
              onChange={(event) =>
                updateFilter("peminatanId", event.target.value)
              }
            >
              <option value="">Semua Peminatan</option>
              {(peminatanQuery.data ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={filters.startDate ?? ""}
              onChange={(event) => updateFilter("startDate", event.target.value)}
              title="Start Date"
            />

            <input
              type="date"
              value={filters.endDate ?? ""}
              onChange={(event) => updateFilter("endDate", event.target.value)}
              title="End Date"
            />

            <button
              type="button"
              className="secondary-button"
              onClick={handleExportExcel}
              disabled={Boolean(isExporting)}
            >
              {isExporting === "excel" ? "Exporting..." : "Export Excel"}
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={handleExportPdf}
              disabled={Boolean(isExporting)}
            >
              {isExporting === "pdf" ? "Exporting..." : "Export PDF"}
            </button>
          </div>
        </div>

        {laporanQuery.isLoading ? (
          <EmptyState
            title="Memuat laporan..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={rows}
            emptyMessage="Belum ada data sesuai filter"
            columns={[
              {
                key: "no",
                header: "No",
                align: "center",
                render: (item) => item.no
              },
              {
                key: "mahasiswa",
                header: "Mahasiswa",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.mahasiswa}</strong>
                    <span>
                      {item.npm} • {item.email || "-"}
                    </span>
                  </div>
                )
              },
              {
                key: "judul",
                header: "Judul",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.judul || "Tanpa judul"}</strong>
                    <span>{item.peminatan || "-"}</span>
                  </div>
                )
              },
              {
                key: "tahap",
                header: "Tahap",
                align: "center",
                render: (item) => <StatusBadge value={item.tahap} size="sm" />
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => <StatusBadge value={item.status} size="sm" />
              },
              {
                key: "pembimbing",
                header: "Pembimbing",
                render: (item) => item.pembimbing || "-"
              },
              {
                key: "bimbingan",
                header: "Bimbingan",
                align: "center",
                render: (item) => (
                  <div className="table-title-cell table-center-cell">
                    <strong>{item.bimbinganValid}/8</strong>
                    <span>{item.progress}%</span>
                  </div>
                )
              },
              {
                key: "nilai",
                header: "Nilai",
                align: "center",
                render: (item) => (
                  <div className="score-box table-score-box">
                    <strong>{item.nilaiAkhir || "-"}</strong>
                    <small>{item.nilaiHuruf || "-"}</small>
                  </div>
                )
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

        <div className="pagination-row">
          <button
            type="button"
            className="secondary-button"
            disabled={(filters.page ?? 1) <= 1}
            onClick={() => updateFilter("page", Math.max((filters.page ?? 1) - 1, 1))}
          >
            Sebelumnya
          </button>

          <span>
            Halaman {meta?.page ?? filters.page ?? 1} dari{" "}
            {meta?.totalPages ?? 1}
          </span>

          <button
            type="button"
            className="secondary-button"
            disabled={(meta?.page ?? 1) >= (meta?.totalPages ?? 1)}
            onClick={() => updateFilter("page", (filters.page ?? 1) + 1)}
          >
            Berikutnya
          </button>
        </div>
      </section>

      {drawerMode === "detail" && selectedRow ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside
            className="crud-drawer laporan-drawer"
            aria-label="Detail laporan skripsi"
          >
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Detail Laporan</p>
                <h2>Detail Skripsi</h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closeDrawer}
              >
                Tutup
              </button>
            </div>

            <div className="laporan-detail-stack">
              <div className="skripsi-detail-title">
                <strong>{selectedRow.judul || "Tanpa judul"}</strong>
                <StatusBadge value={selectedRow.status} />
              </div>

              <div className="info-list">
                <div className="info-row">
                  <span>Mahasiswa</span>
                  <strong>{selectedRow.mahasiswa}</strong>
                </div>

                <div className="info-row">
                  <span>NPM</span>
                  <strong>{selectedRow.npm}</strong>
                </div>

                <div className="info-row">
                  <span>Email</span>
                  <strong>{selectedRow.email || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Peminatan</span>
                  <strong>{selectedRow.peminatan || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Jenis Skripsi</span>
                  <strong>{selectedRow.jenisSkripsi || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Tahap</span>
                  <strong>{selectedRow.tahap || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Status</span>
                  <strong>{selectedRow.status || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Pembimbing</span>
                  <p>{selectedRow.pembimbing || "-"}</p>
                </div>

                <div className="info-row">
                  <span>Penguji</span>
                  <p>{selectedRow.penguji || "-"}</p>
                </div>

                <div className="info-row">
                  <span>Bimbingan Valid</span>
                  <strong>{selectedRow.bimbinganValid}/8</strong>
                </div>

                <div className="info-row">
                  <span>Jumlah Berkas</span>
                  <strong>{selectedRow.jumlahBerkas}</strong>
                </div>

                <div className="info-row">
                  <span>Jumlah Revisi</span>
                  <strong>{selectedRow.jumlahRevisi}</strong>
                </div>

                <div className="info-row">
                  <span>Nilai</span>
                  <strong>
                    {selectedRow.nilaiAkhir || "-"} /{" "}
                    {selectedRow.nilaiHuruf || "-"}
                  </strong>
                </div>

                <div className="info-row">
                  <span>Progress</span>
                  <strong>{selectedRow.progress}%</strong>
                </div>

                <div className="info-row">
                  <span>Jadwal Sidang</span>
                  <strong>{selectedRow.jadwalSidang || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Ruang</span>
                  <strong>{selectedRow.ruang || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Dibuat</span>
                  <strong>{formatDate(selectedRow.createdAt)}</strong>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}