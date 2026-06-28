import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import EmptyState from "../../components/state/EmptyState";
import ErrorState from "../../components/state/ErrorState";
import LoadingState from "../../components/state/LoadingState";
import { api } from "../../services/api";
import { formatDateTime, formatLabel } from "../../utils/format";
import { useAuth } from "../../auth/AuthContext";
import StatusBadge from "../../components/ui/StatusBadge";

type PrimitiveValue = string | number | boolean | null | undefined;

type DashboardSchedule = {
  id?: string;
  status?: string | null;
  waktuMulai?: string | null;
  waktuSelesai?: string | null;
  tempatManual?: string | null;
  ruang?: {
    name?: string | null;
    nama?: string | null;
  } | null;
  skripsi?: {
    title?: string | null;
    judul?: string | null;
    mahasiswa?: {
      name?: string | null;
      identifier?: string | null;
    } | null;
  } | null;
};

type DashboardSkripsi = {
  id?: string;
  title?: string | null;
  judul?: string | null;
  status?: string | null;
  tahap?: string | null;
  nilaiAkhir?: string | number | null;
  nilaiHuruf?: string | null;
  progressPercent?: number | null;
  gamification?: {
    progressPercent?: number | null;
  } | null;
};

type DashboardAssignment = {
  id?: string;
  title?: string | null;
  label?: string | null;
  status?: string | null;
  dueDate?: string | null;
  deadline?: string | null;
};

type DashboardSummary = Record<string, unknown> & {
  latestSkripsi?: DashboardSkripsi | null;
  nextJadwalSidang?: DashboardSchedule | null;
  upcomingSidang?: DashboardSchedule[];
  assignments?: DashboardAssignment[];
};

const hiddenPrimitiveKeys = [
  "latestSkripsi",
  "nextJadwalSidang",
  "assignments",
  "upcomingSidang"
];

const workflowSteps = [
  "SEMINAR_PROPOSAL",
  "KOMPRE",
  "SIDANG_SKRIPSI",
  "FINAL"
];

function isPrimitive(value: unknown): value is PrimitiveValue {
  return (
    value === null ||
    value === undefined ||
    ["string", "number", "boolean"].includes(typeof value)
  );
}

function normalizeStatus(value?: string | null) {
  return value ? value.replace(/_/g, " ") : "-";
}

function getSkripsiTitle(item?: DashboardSkripsi | null) {
  return item?.title || item?.judul || "Belum ada judul skripsi";
}

function getScheduleTitle(item?: DashboardSchedule | null) {
  return item?.skripsi?.title || item?.skripsi?.judul || "Jadwal sidang";
}

function getScheduleRoom(item?: DashboardSchedule | null) {
  return (
    item?.ruang?.name ||
    item?.ruang?.nama ||
    item?.tempatManual ||
    "Ruang belum ditentukan"
  );
}

function getProgressValue(item?: DashboardSkripsi | null) {
  return item?.gamification?.progressPercent ?? item?.progressPercent ?? 0;
}

function getAssignmentTitle(item: DashboardAssignment) {
  return item.title || item.label || "Tugas perlu ditindaklanjuti";
}

export default function DashboardHome() {
  const { user } = useAuth();

  const summaryQuery = useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const response = await api.get<{
        success: boolean;
        data: DashboardSummary;
      }>("/dashboard/my-summary");

      return response.data.data;
    }
  });

  if (summaryQuery.isLoading) {
    return <LoadingState message="Memuat dashboard..." />;
  }

  if (summaryQuery.isError) {
    return (
      <ErrorState
        title="Dashboard gagal dimuat"
        message="Pastikan backend berjalan dan sesi login masih aktif."
      />
    );
  }

  const data = summaryQuery.data ?? {};
  const latestSkripsi = data.latestSkripsi ?? null;
  const nextJadwalSidang = data.nextJadwalSidang ?? null;
  const upcomingSidang = data.upcomingSidang ?? [];
  const assignments = data.assignments ?? [];

  const statEntries = Object.entries(data).filter(
    ([key, value]) => !hiddenPrimitiveKeys.includes(key) && isPrimitive(value)
  );

  const progress = getProgressValue(latestSkripsi);

  return (
    <section className="page-stack dashboard-page">
      <section className="dashboard-hero-panel">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Selamat datang, {user?.name || "User"}</h1>
          <p className="muted">
            Pantau aktivitas akademik, progres skripsi, jadwal sidang, dan
            tugas yang perlu ditindaklanjuti.
          </p>

          <div className="dashboard-hero-actions">
            <Link to="/app/skripsi" className="primary-button">
              Lihat Skripsi
            </Link>

            <Link to="/app/notifications" className="secondary-button">
              Cek Notifikasi
            </Link>
          </div>
        </div>

        <div className="dashboard-progress-card">
          <small>Progress Skripsi</small>
          <strong>{progress}%</strong>

          <div className="progress-bar">
            <span style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
          </div>

          <p>{latestSkripsi ? getSkripsiTitle(latestSkripsi) : "Belum ada skripsi aktif"}</p>
        </div>
      </section>

      {statEntries.length > 0 ? (
        <section className="dashboard-kpi-grid">
          {statEntries.map(([key, value]) => (
            <article key={key} className="dashboard-kpi-card">
              <small>{formatLabel(key)}</small>
              <strong>{String(value ?? 0)}</strong>
            </article>
          ))}
        </section>
      ) : null}

      <section className="dashboard-main-grid">
        <article className="dashboard-panel dashboard-panel-large">
          <div className="dashboard-panel-head">
            <div>
              <p className="eyebrow">Skripsi</p>
              <h2>Progres Akademik</h2>
            </div>

            <Link to="/app/skripsi" className="small-public-link">
              Detail
            </Link>
          </div>

          {latestSkripsi ? (
            <>
              <h3>{getSkripsiTitle(latestSkripsi)}</h3>

              <div className="dashboard-meta-grid">
                <div>
                  <small>Tahap</small>
                  <strong>{normalizeStatus(latestSkripsi.tahap)}</strong>
                </div>

                <div>
                  <small>Status</small>
                  <StatusBadge value={latestSkripsi.status} />
                </div>

                <div>
                  <small>Nilai</small>
                  <strong>
                    {latestSkripsi.nilaiAkhir ?? "-"}{" "}
                    {latestSkripsi.nilaiHuruf ? `(${latestSkripsi.nilaiHuruf})` : ""}
                  </strong>
                </div>
              </div>

              <div className="dashboard-workflow">
                {workflowSteps.map((step) => {
                  const isActive = latestSkripsi.tahap === step;

                  return (
                    <div
                      key={step}
                      className={
                        isActive
                          ? "dashboard-workflow-step active"
                          : "dashboard-workflow-step"
                      }
                    >
                      <span />
                      <strong>{normalizeStatus(step)}</strong>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <EmptyState
              title="Belum ada skripsi aktif"
              message="Data skripsi akan muncul setelah proses seminar proposal dibuat."
            />
          )}
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-head">
            <div>
              <p className="eyebrow">Jadwal</p>
              <h2>Sidang Terdekat</h2>
            </div>

            <Link to="/app/jadwal-sidang" className="small-public-link">
              Semua
            </Link>
          </div>

          {nextJadwalSidang ? (
            <div className="dashboard-schedule-highlight">
              <strong>{getScheduleTitle(nextJadwalSidang)}</strong>
              <p>{formatDateTime(nextJadwalSidang.waktuMulai)}</p>
              <span>{getScheduleRoom(nextJadwalSidang)}</span>
            </div>
          ) : (
            <EmptyState
              title="Belum ada jadwal"
              message="Jadwal sidang terdekat akan tampil di sini."
            />
          )}
        </article>
      </section>

      <section className="dashboard-main-grid">
        <article className="dashboard-panel">
          <div className="dashboard-panel-head">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2>Sidang Mendatang</h2>
            </div>
          </div>

          {upcomingSidang.length > 0 ? (
            <div className="dashboard-list">
              {upcomingSidang.slice(0, 4).map((item, index) => (
                <article key={item.id || index} className="dashboard-list-item">
                  <div>
                    <strong>{getScheduleTitle(item)}</strong>
                    <p>{formatDateTime(item.waktuMulai)}</p>
                  </div>

                  <StatusBadge value={item.status} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada agenda"
              message="Sidang mendatang akan tampil setelah jadwal dibuat."
            />
          )}
        </article>

        <article className="dashboard-panel">
          <div className="dashboard-panel-head">
            <div>
              <p className="eyebrow">Tugas</p>
              <h2>Perlu Ditindaklanjuti</h2>
            </div>
          </div>

          {assignments.length > 0 ? (
            <div className="dashboard-list">
              {assignments.slice(0, 5).map((item, index) => (
                <article key={item.id || index} className="dashboard-list-item">
                  <div>
                    <strong>{getAssignmentTitle(item)}</strong>
                    <p>
                      Deadline:{" "}
                      {formatDateTime(item.deadline || item.dueDate || null)}
                    </p>
                  </div>

                  <StatusBadge value={item.status} />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Tidak ada tugas"
              message="Tugas dan approval akan muncul saat ada aktivitas baru."
            />
          )}
        </article>
      </section>
    </section>
  );
}