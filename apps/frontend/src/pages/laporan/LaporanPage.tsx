import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import FilterToolbar from "../../components/ui/FilterToolbar";
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
        <DataTable
          data={rows}
          isLoading={laporanQuery.isLoading}
          emptyMessage="Belum ada data sesuai filter"
          toolbar={
            <FilterToolbar
              title="Data Skripsi"
              description={`Total: ${meta?.total ?? 0} data • Halaman ${meta?.page ?? 1}/${meta?.totalPages ?? 1}`}
              searchValue={filters.search ?? ""}
              onSearchChange={(val) => updateFilter("search", val)}
              searchPlaceholder="Cari nama, NPM, atau judul..."
              action={
                <div className="row-inline">
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
              }
            >
              <div className="filter-field">
                <label>Status</label>
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
              </div>

              <div className="filter-field">
                <label>Tahap</label>
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
              </div>

              <div className="filter-field">
                <label>Peminatan</label>
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
              </div>

              <div className="filter-field">
                <label>Start Date</label>
                <input
                  type="date"
                  value={filters.startDate ?? ""}
                  onChange={(event) => updateFilter("startDate", event.target.value)}
                  title="Start Date"
                />
              </div>

              <div className="filter-field">
                <label>End Date</label>
                <input
                  type="date"
                  value={filters.endDate ?? ""}
                  onChange={(event) => updateFilter("endDate", event.target.value)}
                  title="End Date"
                />
              </div>
            </FilterToolbar>
          }
          pagination={{
            page: filters.page ?? 1,
            pageSize: filters.limit ?? 20,
            totalItems: meta?.total ?? 0,
            totalPages: meta?.totalPages ?? 1,
            onPageChange: (page) => updateFilter("page", page),
            itemLabel: "skripsi"
          }}
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

            <div className="page-stack">
              <div className="workflow-history-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                <div>
                  <p className="eyebrow" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                    {selectedRow.npm || "-"}
                  </p>
                  <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px", color: "var(--on-surface)" }}>
                    {selectedRow.mahasiswa || "-"}
                  </h2>
                  <p className="muted" style={{ color: "var(--on-surface-variant)", fontSize: "14px" }}>
                    {selectedRow.judul || "Tanpa judul"}
                  </p>
                </div>

                <div className="workflow-final-status" style={{ textAlign: "right" }}>
                  <StatusBadge value={selectedRow.status} size="md" />
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--on-surface-variant)", fontWeight: 600 }}>
                    {selectedRow.jenisSkripsi || "Skripsi"}
                  </div>
                </div>
              </div>

              <div className="workflow-progress-track" style={{ height: "4px", backgroundColor: "var(--surface-container-high)", borderRadius: "4px", overflow: "hidden", marginBottom: "24px" }}>
                <span style={{ display: "block", height: "100%", width: `${selectedRow.progress || 0}%`, backgroundColor: "var(--primary)" }} />
              </div>

              <DataTable<any>
                data={[
                  { label: "Email", value: selectedRow.email || "-" },
                  { label: "Peminatan", value: selectedRow.peminatan || "-" },
                  { label: "Tahap", value: selectedRow.tahap || "-" },
                  { label: "Status", value: selectedRow.status || "-" },
                  { label: "Pembimbing", value: selectedRow.pembimbing || "-" },
                  { label: "Penguji", value: selectedRow.penguji || "-" },
                  { label: "Bimbingan Valid", value: `${selectedRow.bimbinganValid}/8` },
                  { label: "Jumlah Berkas", value: selectedRow.jumlahBerkas },
                  { label: "Jumlah Revisi", value: selectedRow.jumlahRevisi },
                  { label: "Nilai", value: `${selectedRow.nilaiAkhir || "-"} / ${selectedRow.nilaiHuruf || "-"}` },
                  { label: "Progress", value: `${selectedRow.progress}%` },
                  { label: "Jadwal Sidang", value: selectedRow.jadwalSidang || "-" },
                  { label: "Ruang", value: selectedRow.ruang || "-" },
                  { label: "Dibuat", value: formatDate(selectedRow.createdAt) }
                ]}
                columns={[
                  { key: "label", header: "Informasi", width: "40%", render: (item) => <strong>{item.label}</strong> },
                  { key: "value", header: "Detail", render: (item) => item.value }
                ]}
                compact
                emptyMessage="Tidak ada data."
                getRowKey={(item) => item.label}
              />
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}