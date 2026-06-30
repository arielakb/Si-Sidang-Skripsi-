import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import FilterToolbar from "../../components/ui/FilterToolbar";
import SectionCard from "../../components/ui/SectionCard";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  getPublicRooms,
  getPublicScheduleDetail,
  getPublicSchedules,
  type PublicJadwalSidang,
  type PublicListResponse,
  type PublicRuang
} from "../../services/publicSchedule";

const jenisSidangOptions = [
  {
    value: "SEMINAR_PROPOSAL",
    label: "Seminar Proposal"
  },
  {
    value: "SEMINAR_HASIL",
    label: "Seminar Hasil"
  },
  {
    value: "SIDANG_KOMPRE",
    label: "Sidang Kompre"
  },
  {
    value: "SIDANG_AKHIR",
    label: "Sidang Akhir"
  }
];

const statusOptions = ["DIJADWALKAN", "BERLANGSUNG", "SELESAI"];

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
    dateStyle: "full"
  }).format(new Date(value));
}

function getRoomLabel(item: PublicJadwalSidang) {
  return (
    item.ruangLabel ||
    item.ruang?.name ||
    item.ruang?.code ||
    item.tempatManual ||
    item.linkVicon ||
    "Ruang belum ditentukan"
  );
}

function getJenisSidangLabel(item: PublicJadwalSidang) {
  return (
    item.jenisSidangLabel ||
    jenisSidangOptions.find((option) => option.value === item.jenisSidang)
      ?.label ||
    item.jenisSidang ||
    "Jadwal Sidang"
  );
}

function getDetailHref(id: string) {
  return `/?jadwal=${id}#jadwal-sidang`;
}

function getPublicSummary(rows: PublicJadwalSidang[]) {
  return {
    total: rows.length,
    sempro: rows.filter((item) => item.jenisSidang === "SEMINAR_PROPOSAL")
      .length,
    semhas: rows.filter((item) => item.jenisSidang === "SEMINAR_HASIL").length,
    kompre: rows.filter((item) => item.jenisSidang === "SIDANG_KOMPRE").length,
    akhir: rows.filter((item) => item.jenisSidang === "SIDANG_AKHIR").length,
    berlangsung: rows.filter((item) => item.status === "BERLANGSUNG").length
  };
}

export default function PublicDashboard() {
  const [search, setSearch] = useState("");
  const [jenisSidang, setJenisSidang] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tanggalFilter, setTanggalFilter] = useState("");
  const [ruangId, setRuangId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedJadwalId, setSelectedJadwalId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jadwalId = params.get("jadwal");

    if (jadwalId) {
      setSelectedJadwalId(jadwalId);
    }
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, jenisSidang, statusFilter, tanggalFilter, ruangId, limit]);

  const jadwalQuery = useQuery<PublicListResponse<PublicJadwalSidang>>({
    queryKey: [
      "public-jadwal-sidang",
      {
        search,
        jenisSidang,
        statusFilter,
        tanggalFilter,
        ruangId,
        page,
        limit
      }
    ],
    queryFn: () =>
      getPublicSchedules({
        search,
        jenisSidang,
        status: statusFilter,
        tanggal: tanggalFilter,
        ruangId,
        page,
        limit,
        sortBy: "tanggal",
        sortOrder: "asc"
      }),
    placeholderData: keepPreviousData
  });

  const ruangQuery = useQuery<PublicRuang[]>({
    queryKey: ["public-ruang"],
    queryFn: getPublicRooms
  });

  const selectedJadwalQuery = useQuery<PublicJadwalSidang>({
    queryKey: ["public-jadwal-sidang-detail", selectedJadwalId],
    queryFn: () => getPublicScheduleDetail(String(selectedJadwalId)),
    enabled: Boolean(selectedJadwalId)
  });

  const jadwalRows: PublicJadwalSidang[] = jadwalQuery.data?.data ?? [];
  const meta = jadwalQuery.data?.meta ?? {
    page,
    limit,
    total: 0,
    totalPages: 1
  };

  const summary = useMemo(() => getPublicSummary(jadwalRows), [jadwalRows]);
  const selectedJadwal = selectedJadwalQuery.data ?? null;

  const closeDetail = () => {
    setSelectedJadwalId(null);
    window.history.replaceState({}, "", "/#jadwal-sidang");
  };

  const openDetail = (item: PublicJadwalSidang) => {
    setSelectedJadwalId(item.id);
    window.history.replaceState({}, "", getDetailHref(item.id));
  };

  return (
    <main className="public-up-page">
      <nav className="public-up-nav">
        <div className="brand-panel">
          <img
            src="/logo-up.png"
            alt="Logo Universitas Pancasila"
            className="brand-logo"
          />
          <div className="brand-copy">
            <strong>Sisidang TI</strong>
            <span>Universitas Pancasila</span>
          </div>
        </div>

        <div className="public-up-nav-actions">
          <a href="#jadwal-sidang" className="secondary-button">
            Jadwal Sidang
          </a>

          <Link to="/login" className="primary-button">
            Login
          </Link>
        </div>
      </nav>

      <section className="public-up-hero">
        <div>
          <p className="eyebrow">Program Studi Teknik Informatika</p>
          <h1>Sistem Administrasi Skripsi Universitas Pancasila</h1>
          <p>
            Portal informasi seminar, bimbingan, jadwal sidang, revisi, dan
            finalisasi skripsi untuk mahasiswa, dosen, dan administrasi prodi.
          </p>

          <div className="dashboard-quick-actions">
            <Link to="/login" className="primary-button">
              Masuk ke Sistem
            </Link>

            <a href="#jadwal-sidang" className="secondary-button">
              Lihat Jadwal Sidang
            </a>
          </div>
        </div>

        <div className="public-up-hero-card">
          <span>Jadwal Sidang Terpublikasi</span>
          <strong>{meta.total}</strong>
          <p>
            Menampilkan sidang dengan status dijadwalkan, berlangsung, atau
            selesai.
          </p>
        </div>
      </section>

      <section className="public-feature-grid">
        <article>
          <strong>Seminar Proposal</strong>
          <span>Upload proposal, presentasi, jadwal, dan hasil seminar.</span>
        </article>

        <article>
          <strong>Seminar Hasil</strong>
          <span>Sidang hasil, input nilai, revisi, dan validasi akademik.</span>
        </article>

        <article>
          <strong>Sidang Kompre</strong>
          <span>Jadwal dan hasil sidang komprehensif skripsi mahasiswa.</span>
        </article>

        <article>
          <strong>Sidang Akhir</strong>
          <span>Pengumuman hasil akhir lulus atau tidak lulus skripsi.</span>
        </article>
      </section>

      <section id="jadwal-sidang" className="public-schedule-section">
        <div className="public-section-head">
          <div>
            <p className="eyebrow">Jadwal Publik</p>
            <h2>Jadwal Sidang Skripsi</h2>
            <p className="muted">
              Jadwal sidang yang sudah dipublikasikan oleh Program Studi Teknik
              Informatika Universitas Pancasila.
            </p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={() => jadwalQuery.refetch()}
          >
            Refresh
          </button>
        </div>

        <div className="public-schedule-summary-grid">
          <article>
            <span>Total Jadwal</span>
            <strong>{meta.total}</strong>
          </article>
          <article>
            <span>Sempro</span>
            <strong>{summary.sempro}</strong>
          </article>
          <article>
            <span>Semhas</span>
            <strong>{summary.semhas}</strong>
          </article>
          <article>
            <span>Kompre</span>
            <strong>{summary.kompre}</strong>
          </article>
          <article>
            <span>Sidang Akhir</span>
            <strong>{summary.akhir}</strong>
          </article>
          <article>
            <span>Berlangsung</span>
            <strong>{summary.berlangsung}</strong>
          </article>
        </div>

        <SectionCard
          title="Daftar Jadwal Sidang"
          description="Filter berdasarkan jenis sidang, tanggal, ruang, status, mahasiswa, atau judul skripsi."
          className="public-schedule-table-card"
        >
          {jadwalQuery.isLoading && jadwalRows.length === 0 ? (
            <EmptyState
              title="Memuat jadwal sidang..."
              description="Mohon tunggu sebentar."
            />
          ) : (
            <DataTable<PublicJadwalSidang>
              data={jadwalRows}
              emptyMessage="Belum ada jadwal sidang publik"
              isLoading={jadwalQuery.isLoading && jadwalRows.length === 0}
              loadingMessage="Memuat jadwal sidang..."
              getRowKey={(item) => item.id}
              toolbar={
                <FilterToolbar
                  searchValue={search}
                  onSearchChange={setSearch}
                  searchPlaceholder="Cari judul, mahasiswa, NPM, ruang..."
                  meta={
                    <span>
                      Menampilkan <strong>{jadwalRows.length}</strong> dari{" "}
                      <strong>{meta.total}</strong> jadwal publik.
                    </span>
                  }
                >
                  <div className="filter-field">
                    <label>Jenis Sidang</label>
                    <select
                      value={jenisSidang}
                      onChange={(event) => setJenisSidang(event.target.value)}
                    >
                      <option value="">Semua Jenis</option>
                      {jenisSidangOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

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

                  <div className="filter-field">
                    <label>Tanggal</label>
                    <input
                      type="date"
                      value={tanggalFilter}
                      onChange={(event) => setTanggalFilter(event.target.value)}
                    />
                  </div>

                  <div className="filter-field">
                    <label>Ruang</label>
                    <select
                      value={ruangId}
                      onChange={(event) => setRuangId(event.target.value)}
                    >
                      <option value="">Semua Ruang</option>
                      {(ruangQuery.data ?? []).map((ruang) => (
                        <option key={ruang.id} value={ruang.id}>
                          {ruang.name || ruang.code}
                        </option>
                      ))}
                    </select>
                  </div>
                </FilterToolbar>
              }
              columns={[
                {
                  key: "waktu",
                  header: "Waktu",
                  mobilePriority: "subtitle",
                  render: (item) => (
                    <div className="table-title-cell">
                      <strong>{formatDateTime(item.waktuMulai)}</strong>
                      <span>Selesai: {formatDateTime(item.waktuSelesai)}</span>
                    </div>
                  )
                },
                {
                  key: "jenis",
                  header: "Jenis Sidang",
                  mobilePriority: "title",
                  render: (item) => (
                    <div className="table-title-cell">
                      <strong>{getJenisSidangLabel(item)}</strong>
                      <span>Attempt {item.sidang?.attemptNo || 1}</span>
                    </div>
                  )
                },
                {
                  key: "mahasiswa",
                  header: "Mahasiswa",
                  render: (item) => (
                    <div className="table-title-cell">
                      <strong>{item.skripsi?.mahasiswa?.name || "-"}</strong>
                      <span>{item.skripsi?.mahasiswa?.identifier || "-"}</span>
                    </div>
                  )
                },
                {
                  key: "judul",
                  header: "Judul Skripsi",
                  render: (item) => (
                    <div className="table-title-cell public-title-cell">
                      <strong>{item.skripsi?.title || "Tanpa judul"}</strong>
                      <span>{item.skripsi?.peminatan?.name || "-"}</span>
                    </div>
                  )
                },
                {
                  key: "ruang",
                  header: "Ruang",
                  render: (item) => getRoomLabel(item)
                },
                {
                  key: "status",
                  header: "Status",
                  align: "center",
                  mobilePriority: "meta",
                  render: (item) => (
                    <div className="public-status-stack">
                      <StatusBadge value={item.status} size="sm" />
                      {item.sidangStatus ? <small>{item.sidangStatus}</small> : null}
                    </div>
                  )
                },
                {
                  key: "detail",
                  header: "Detail",
                  align: "center",
                  render: (item) => (
                    <a
                      href={getDetailHref(item.id)}
                      className="small-button"
                      onClick={(event) => {
                        event.preventDefault();
                        openDetail(item);
                      }}
                    >
                      Detail
                    </a>
                  )
                }
              ]}
              pagination={{
                page: meta.page,
                pageSize: meta.limit,
                total: meta.total,
                onPageChange: setPage,
                onPageSizeChange: (pageSize) => {
                  setLimit(pageSize);
                  setPage(1);
                },
                itemLabel: "jadwal"
              }}
              mobileTitle={(item) => getJenisSidangLabel(item)}
              mobileSubtitle={(item) =>
                `${item.skripsi?.mahasiswa?.name || "-"} • ${
                  item.skripsi?.title || "Tanpa judul"
                }`
              }
              mobileMeta={(item) => <StatusBadge value={item.status} size="sm" />}
            />
          )}
        </SectionCard>

        {selectedJadwalId ? (
          <section className="public-detail-panel">
            <div className="public-detail-head">
              <div>
                <p className="eyebrow">Detail Jadwal Publik</p>
                <h2>
                  {selectedJadwal
                    ? getJenisSidangLabel(selectedJadwal)
                    : "Memuat detail..."}
                </h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closeDetail}
              >
                Tutup
              </button>
            </div>

            {selectedJadwalQuery.isLoading ? (
              <EmptyState
                title="Memuat detail jadwal..."
                description="Mohon tunggu sebentar."
              />
            ) : selectedJadwal ? (
              <div className="public-detail-grid">
                <article>
                  <span>Mahasiswa</span>
                  <strong>{selectedJadwal.skripsi?.mahasiswa?.name || "-"}</strong>
                  <small>
                    {selectedJadwal.skripsi?.mahasiswa?.identifier || "-"}
                  </small>
                </article>

                <article>
                  <span>Judul Skripsi</span>
                  <strong>{selectedJadwal.skripsi?.title || "Tanpa judul"}</strong>
                  <small>{selectedJadwal.skripsi?.peminatan?.name || "-"}</small>
                </article>

                <article>
                  <span>Jenis Sidang</span>
                  <strong>{getJenisSidangLabel(selectedJadwal)}</strong>
                  <small>Status sidang: {selectedJadwal.sidangStatus || "-"}</small>
                </article>

                <article>
                  <span>Jadwal</span>
                  <strong>{formatDateOnly(selectedJadwal.tanggal)}</strong>
                  <small>
                    {formatDateTime(selectedJadwal.waktuMulai)} -{" "}
                    {formatDateTime(selectedJadwal.waktuSelesai)}
                  </small>
                </article>

                <article>
                  <span>Ruang / Lokasi</span>
                  <strong>{getRoomLabel(selectedJadwal)}</strong>
                  <small>
                    {selectedJadwal.linkVicon ? "Online / hybrid" : "Tatap muka"}
                  </small>
                </article>

                <article>
                  <span>Status Jadwal</span>
                  <strong>
                    <StatusBadge value={selectedJadwal.status} size="sm" />
                  </strong>
                  <small>Informasi publik tanpa nilai/catatan internal.</small>
                </article>
              </div>
            ) : (
              <EmptyState
                title="Detail jadwal tidak ditemukan"
                description="Jadwal mungkin sudah diubah atau tidak tersedia."
              />
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}
