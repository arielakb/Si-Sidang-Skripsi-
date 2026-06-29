import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import MetricCard from "../../components/ui/MetricCard";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { api } from "../../services/api";

type DashboardSkripsi = {
  id?: string;
  title?: string | null;
  tahap?: string | null;
  status?: string | null;
  progressPercent?: number | null;
  gamification?: {
    progressPercent?: number | null;
  } | null;
  mahasiswa?: {
    name?: string | null;
    identifier?: string | null;
  } | null;
  peminatan?: {
    name?: string | null;
  } | null;
};

type DashboardJadwal = {
  id?: string;
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
  } | null;
};

type DashboardSummary = {
  roleContext?: string;
  unreadNotifications?: number;
  totalUsers?: number;
  activeSkripsi?: number;
  waitingSchedule?: number;
  readySidang?: number;
  selesai?: number;
  pendingPeminjaman?: number;
  latestSkripsi?: DashboardSkripsi | null;
  skripsi?: DashboardSkripsi | null;
  mySkripsi?: DashboardSkripsi[];
  activeSkripsiList?: DashboardSkripsi[];
  upcomingJadwal?: DashboardJadwal[];
  jadwalTerdekat?: DashboardJadwal[];
  upcomingSchedules?: DashboardJadwal[];
  jadwalSidang?: DashboardJadwal[];
};

function normalizePercent(value?: number | null) {
  return Math.min(Math.max(Number(value ?? 0), 0), 100);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getProgressValue(item?: DashboardSkripsi | null) {
  return normalizePercent(
    item?.gamification?.progressPercent ?? item?.progressPercent ?? 0
  );
}

// function getRoomLabel(item?: DashboardJadwal | null) {
//   if (!item) return "-";

//   return (
//     item.ruang?.name ||
//     item.ruang?.nama ||
//     item.ruang?.code ||
//     item.tempatManual ||
//     item.linkVicon ||
//     "Ruang belum ditentukan"
//   );
// }

function getArrayValue<T>(value?: T[] | T | null): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default function DashboardHome() {
  const { user } = useAuth();

  const dashboardQuery = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await api.get<{ data: DashboardSummary }>(
        "/dashboard/my-summary"
      );

      return response.data.data;
    }
  });

  const data = dashboardQuery.data;

  const latestSkripsi =
    data?.latestSkripsi ||
    data?.skripsi ||
    data?.activeSkripsiList?.[0] ||
    data?.mySkripsi?.[0] ||
    null;

  const progress = getProgressValue(latestSkripsi);

  const jadwalRows = [
    ...getArrayValue(data?.upcomingJadwal),
    ...getArrayValue(data?.jadwalTerdekat),
    ...getArrayValue(data?.upcomingSchedules),
    ...getArrayValue(data?.jadwalSidang)
  ].filter(Boolean);

  if (dashboardQuery.isLoading) {
    return (
      <section className="page-stack">
        <PageHeader
          eyebrow="Dashboard"
          title="Memuat Dashboard"
          description="Mohon tunggu sebentar."
        />

        <EmptyState title="Memuat dashboard..." description="Data sedang diambil." />
      </section>
    );
  }

  return (
    <section className="page-stack dashboard-clean-page">
      <section className="dashboard-hero-clean">
        <div>
          <p className="eyebrow">Sisidang TI</p>
          <h1>Selamat datang, {user?.name || "User"}</h1>
          <p>
            Pantau aktivitas akademik, progress skripsi, jadwal sidang,
            notifikasi, dan tugas administrasi dalam satu dashboard.
          </p>

          <div className="dashboard-quick-actions">
            <Link to="/app/skripsi" className="primary-button">
              Lihat Skripsi
            </Link>

            <Link to="/app/notifications" className="secondary-button">
              Cek Notifikasi
            </Link>

            <Link to="/" className="secondary-button">
              Dashboard Publik
            </Link>
          </div>
        </div>

        <div className="dashboard-progress-card">
          <small>Progress Skripsi</small>
          <strong>{progress}%</strong>

          <div className="progress-bar-shell">
            <div
              className="progress-bar-value"
              style={{ width: `${progress}%` }}
            />
          </div>

          <span>
            {latestSkripsi?.title
              ? latestSkripsi.title
              : "Belum ada skripsi aktif"}
          </span>
        </div>
      </section>

      <div className="metric-grid">
        <MetricCard
          label="Role Context"
          value={data?.roleContext || "admin"}
          description="Konteks akses saat ini"
        />

        <MetricCard
          label="Unread Notifications"
          value={data?.unreadNotifications ?? 0}
          description="Notifikasi belum dibaca"
        />

        <MetricCard
          label="Total Users"
          value={data?.totalUsers ?? 0}
          description="Jumlah akun pengguna"
        />

        <MetricCard
          label="Active Skripsi"
          value={data?.activeSkripsi ?? 0}
          description="Skripsi aktif"
        />

        <MetricCard
          label="Waiting Schedule"
          value={data?.waitingSchedule ?? 0}
          description="Menunggu jadwal sidang"
        />

        <MetricCard
          label="Ready Sidang"
          value={data?.readySidang ?? 0}
          description="Siap masuk sidang"
        />

        <MetricCard
          label="Selesai"
          value={data?.selesai ?? 0}
          description="Skripsi selesai"
        />

        <MetricCard
          label="Pending Peminjaman"
          value={data?.pendingPeminjaman ?? 0}
          description="Peminjaman ruang pending"
        />
      </div>

      <div className="dashboard-clean-grid">
        <section className="list-card dashboard-panel-card">
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Skripsi</p>
              <h2>Progress Akademik</h2>
              <p className="muted">
                Ringkasan skripsi aktif dan progress terbaru.
              </p>
            </div>

            <Link to="/app/skripsi" className="secondary-button">
              Detail
            </Link>
          </div>

          {latestSkripsi ? (
            <div className="dashboard-skripsi-highlight">
              <div>
                <strong>{latestSkripsi.title || "Tanpa judul"}</strong>
                <p className="muted">
                  {latestSkripsi.mahasiswa?.name || "-"} •{" "}
                  {latestSkripsi.peminatan?.name || "-"}
                </p>
              </div>

              <div className="dashboard-highlight-footer">
                <StatusBadge value={latestSkripsi.tahap || "-"} size="sm" />
                <StatusBadge value={latestSkripsi.status || "-"} size="sm" />
              </div>

              <div className="table-progress-cell">
                <div className="progress-summary-head">
                  <strong>{progress}%</strong>
                  <span>Progress skripsi</span>
                </div>

                <div className="progress-bar-shell">
                  <div
                    className="progress-bar-value"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Belum ada skripsi aktif"
              description="Data skripsi akan muncul setelah proses seminar proposal dibuat."
            />
          )}
        </section>

        <section className="list-card dashboard-panel-card">
          <div className="table-toolbar">
            <div>
              <p className="eyebrow">Jadwal</p>
              <h2>Sidang Terdekat</h2>
              <p className="muted">
                Jadwal sidang terbaru yang tersedia untuk role Anda.
              </p>
            </div>

            <Link to="/app/jadwal-sidang" className="secondary-button">
              Semua
            </Link>
          </div>

          <DataTable
            data={jadwalRows.slice(0, 5)}
            emptyMessage="Belum ada jadwal"
            columns={[
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
                key: "skripsi",
                header: "Skripsi",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.skripsi?.title || "Tanpa judul"}</strong>
                    <span>{item.skripsi?.mahasiswa?.name || "-"}</span>
                  </div>
                )
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => <StatusBadge value={item.status} size="sm" />
              }
            ]}
          />
        </section>
      </div>
    </section>
  );
}