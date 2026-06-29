import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import StatusBadge from "../../components/ui/StatusBadge";
import { api } from "../../services/api";

type PublicJadwalSidang = {
  id: string;
  status?: string | null;
  waktuMulai?: string | null;
  waktuSelesai?: string | null;
  tempatManual?: string | null;
  linkVicon?: string | null;
  ruang?: {
    code?: string | null;
    name?: string | null;
    nama?: string | null;
  } | null;
  skripsi?: {
    title?: string | null;
    mahasiswa?: {
      name?: string | null;
      identifier?: string | null;
    } | null;
    peminatan?: {
      name?: string | null;
    } | null;
  } | null;
};

const statusOptions = ["DIJADWALKAN", "BERLANGSUNG", "SELESAI"];

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getRoomLabel(item: PublicJadwalSidang) {
  return (
    item.ruang?.name ||
    item.ruang?.nama ||
    item.ruang?.code ||
    item.tempatManual ||
    item.linkVicon ||
    "Ruang belum ditentukan"
  );
}

export default function PublicDashboard() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const jadwalQuery = useQuery({
    queryKey: ["public-jadwal-sidang"],
    queryFn: async () => {
      const response = await api.get<{
        data: PublicJadwalSidang[];
      }>("/public/jadwal-sidang", {
        params: {
          limit: 50
        }
      });

      return response.data.data ?? [];
    }
  });

  const jadwalRows = jadwalQuery.data ?? [];

  const filteredJadwalRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return jadwalRows.filter((item) => {
      const matchesSearch = `${item.skripsi?.title ?? ""} ${
        item.skripsi?.mahasiswa?.name ?? ""
      } ${item.skripsi?.mahasiswa?.identifier ?? ""} ${
        item.skripsi?.peminatan?.name ?? ""
      } ${getRoomLabel(item)} ${item.status ?? ""}`
        .toLowerCase()
        .includes(keyword);

      const matchesStatus = statusFilter
        ? item.status === statusFilter
        : true;

      return matchesSearch && matchesStatus;
    });
  }, [jadwalRows, search, statusFilter]);

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
          <strong>{jadwalRows.length}</strong>
          <p>
            Menampilkan sidang dengan status dijadwalkan, berlangsung, atau
            selesai.
          </p>
        </div>
      </section>

      <section className="public-feature-grid">
        <article>
          <strong>Seminar Proposal</strong>
          <span>Upload proposal, presentasi, dan persetujuan kode etik.</span>
        </article>

        <article>
          <strong>Bimbingan Skripsi</strong>
          <span>Dosen pembimbing memvalidasi progress minimal 8x bimbingan.</span>
        </article>

        <article>
          <strong>Jadwal Sidang</strong>
          <span>Informasi sidang, ruang, waktu, dan status pelaksanaan.</span>
        </article>

        <article>
          <strong>Finalisasi</strong>
          <span>Revisi, nilai sidang, berkas final, dan pengesahan akhir.</span>
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

        <section className="list-card public-schedule-table-card">
          <div className="table-toolbar master-table-toolbar">
            <div>
              <h2>Daftar Jadwal Sidang</h2>
              <p className="muted">
                Table jadwal sidang berdasarkan waktu, mahasiswa, ruang, dan
                status.
              </p>
            </div>

            <div className="master-toolbar-actions">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari judul, mahasiswa, NPM, ruang..."
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

          {jadwalQuery.isLoading ? (
            <EmptyState
              title="Memuat jadwal sidang..."
              description="Mohon tunggu sebentar."
            />
          ) : (
            <DataTable
              data={filteredJadwalRows}
              emptyMessage="Belum ada jadwal sidang publik"
              columns={[
                {
                  key: "no",
                  header: "No",
                  align: "center",
                  render: (_item, index) => index + 1
                },
                {
                  key: "waktu",
                  header: "Waktu",
                  render: (item) => (
                    <div className="table-title-cell">
                      <strong>{formatDateTime(item.waktuMulai)}</strong>
                      <span>Selesai: {formatDateTime(item.waktuSelesai)}</span>
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
                  render: (item) => <StatusBadge value={item.status} size="sm" />
                }
              ]}
            />
          )}
        </section>
      </section>
    </main>
  );
}