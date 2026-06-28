import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  downloadLaporanSkripsiExcel,
  downloadLaporanSkripsiPdf,
  getLaporanSkripsi,
  getLaporanSummary,
  type LaporanFilter
} from "../../services/laporan";
import { getPeminatan } from "../../services/masterData";

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

export default function LaporanPage() {
  const [filters, setFilters] = useState<LaporanFilter>({
    status: "",
    tahap: "",
    peminatanId: "",
    search: "",
    startDate: "",
    endDate: "",
    page: 1,
    limit: 20
  });

  const summaryQuery = useQuery({
    queryKey: ["laporan-summary"],
    queryFn: getLaporanSummary
  });

  const peminatanQuery = useQuery({
    queryKey: ["peminatan"],
    queryFn: getPeminatan
  });

  const laporanQuery = useQuery({
    queryKey: ["laporan-skripsi", filters],
    queryFn: () =>
      getLaporanSkripsi({
        ...filters,
        status: filters.status || undefined,
        tahap: filters.tahap || undefined,
        peminatanId: filters.peminatanId || undefined,
        search: filters.search || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      })
  });

  const [isExporting, setIsExporting] = useState("");

  async function handleExportExcel() {
    setIsExporting("excel");

    try {
      await downloadLaporanSkripsiExcel(filters);
    } finally {
      setIsExporting("");
    }
  }

  async function handleExportPdf() {
    setIsExporting("pdf");

    try {
      await downloadLaporanSkripsiPdf(filters);
    } finally {
      setIsExporting("");
    }
  }

  const summary = summaryQuery.data;
  const rows = laporanQuery.data?.data ?? [];
  const meta = laporanQuery.data?.meta;

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Laporan</p>
        <h1>Analytics & Laporan Skripsi</h1>
        <p className="muted">
          Pantau progres skripsi, distribusi status, dan export laporan akademik.
        </p>
      </div>

      {summary ? (
        <>
          <section className="stats-grid">
            {Object.entries(summary.cards).map(([key, value]) => (
              <div key={key} className="stat-card">
                <small>{key}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </section>

          <section className="two-column">
            <div className="list-card">
              <h2>Distribusi Status</h2>
              {summary.byStatus.map((item) => (
                <article key={item.status} className="list-item">
                  <strong>{item.status}</strong>
                  <span>{item.count}</span>
                </article>
              ))}
            </div>

            <div className="list-card">
              <h2>Distribusi Tahap</h2>
              {summary.byTahap.map((item) => (
                <article key={item.tahap} className="list-item">
                  <strong>{item.tahap}</strong>
                  <span>{item.count}</span>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}

      <section className="card form-grid">
        <label>
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
                page: 1
              }))
            }
          >
            <option value="">Semua status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Tahap</span>
          <select
            value={filters.tahap}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                tahap: event.target.value,
                page: 1
              }))
            }
          >
            <option value="">Semua tahap</option>
            {tahapOptions.map((tahap) => (
              <option key={tahap} value={tahap}>
                {tahap}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Peminatan</span>
          <select
            value={filters.peminatanId}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                peminatanId: event.target.value,
                page: 1
              }))
            }
          >
            <option value="">Semua peminatan</option>
            {(peminatanQuery.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Search</span>
          <input
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
                page: 1
              }))
            }
            placeholder="Nama/NPM/judul"
          />
        </label>

        <label>
          <span>Start Date</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                startDate: event.target.value,
                page: 1
              }))
            }
          />
        </label>

        <label>
          <span>End Date</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                endDate: event.target.value,
                page: 1
              }))
            }
          />
        </label>
      </section>

      <section className="page-header-row">
        <div>
          <h2>Data Skripsi</h2>
          <p className="muted">
            Total: {meta?.total ?? 0} data • Halaman {meta?.page ?? 1}/
            {meta?.totalPages ?? 1}
          </p>
        </div>

        <div className="row-inline">
          <button
            className="secondary-button"
            onClick={handleExportExcel}
            disabled={Boolean(isExporting)}
          >
            {isExporting === "excel" ? "Exporting..." : "Export Excel"}
          </button>

          <button
            className="secondary-button"
            onClick={handleExportPdf}
            disabled={Boolean(isExporting)}
          >
            {isExporting === "pdf" ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </section>

      <section className="table-card">
        {laporanQuery.isLoading ? (
          <p>Memuat laporan...</p>
        ) : rows.length === 0 ? (
          <p>Belum ada data sesuai filter.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>No</th>
                  <th>NPM</th>
                  <th>Mahasiswa</th>
                  <th>Judul</th>
                  <th>Peminatan</th>
                  <th>Tahap</th>
                  <th>Status</th>
                  <th>Pembimbing</th>
                  <th>Bimbingan</th>
                  <th>Nilai</th>
                  <th>Progress</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((item) => (
                  <tr key={`${item.npm}-${item.no}`}>
                    <td>{item.no}</td>
                    <td>{item.npm}</td>
                    <td>{item.mahasiswa}</td>
                    <td>{item.judul}</td>
                    <td>{item.peminatan}</td>
                    <td>{item.tahap}</td>
                    <td>{item.status}</td>
                    <td>{item.pembimbing}</td>
                    <td>{item.bimbinganValid}/8</td>
                    <td>
                      {item.nilaiAkhir} / {item.nilaiHuruf}
                    </td>
                    <td>{item.progress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}