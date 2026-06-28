import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { useAuth } from "../../auth/AuthContext";

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
};

type PublicUser = {
  identifier?: string | null;
  name?: string | null;
};

type PublicRuang = {
  name?: string | null;
  nama?: string | null;
  kode?: string | null;
};

type PublicSkripsi = {
  title?: string | null;
  judul?: string | null;
  mahasiswa?: PublicUser | null;
  peminatan?: {
    name?: string | null;
  } | null;
  jenisSkripsi?: {
    name?: string | null;
  } | null;
};

type PublicJadwalSidang = {
  id: string;
  status?: string | null;
  tipeSidang?: string | null;
  tanggal?: string | null;
  waktuMulai?: string | null;
  waktuSelesai?: string | null;
  tempatManual?: string | null;
  linkVicon?: string | null;
  ruang?: PublicRuang | null;
  skripsi?: PublicSkripsi | null;
};

type PublicJadwalResponse =
  | ApiResponse<PublicJadwalSidang[]>
  | PublicJadwalSidang[];

const roleInfo = [
  {
    role: "Mahasiswa",
    description: "Daftar seminar proposal, upload berkas, bimbingan, revisi, dan finalisasi."
  },
  {
    role: "Dosen Pembimbing",
    description: "Validasi bimbingan, approve maju sidang, memberi nilai, dan review revisi."
  },
  {
    role: "Dosen Penguji",
    description: "Review seminar proposal, input nilai sidang, dan memberi catatan revisi."
  },
  {
    role: "Koordinator / Ketua Prodi",
    description: "Monitoring skripsi, jadwal sidang, laporan, dan approval akhir."
  },
  {
    role: "Staf Prodi",
    description: "Mengelola peminjaman ruang dan administrasi ruang sidang."
  },
  {
    role: "Admin",
    description: "Mengelola user, role, master data, audit log, dan seluruh workflow sistem."
  }
];

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getDateValue(value?: string | null) {
  if (!value) return 0;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  return date.getTime();
}

function getRoomName(item: PublicJadwalSidang) {
  return (
    item.ruang?.name ||
    item.ruang?.nama ||
    item.tempatManual ||
    "Belum ditentukan"
  );
}

function getSkripsiTitle(item: PublicJadwalSidang) {
  return item.skripsi?.title || item.skripsi?.judul || "Judul belum tersedia";
}

function getMahasiswaName(item: PublicJadwalSidang) {
  const mahasiswa = item.skripsi?.mahasiswa;

  if (!mahasiswa) {
    return "Mahasiswa belum tersedia";
  }

  if (mahasiswa.name && mahasiswa.identifier) {
    return `${mahasiswa.name} (${mahasiswa.identifier})`;
  }

  return mahasiswa.name || mahasiswa.identifier || "Mahasiswa belum tersedia";
}

function getStatusLabel(status?: string | null) {
  if (!status) return "TERJADWAL";

  return status.replace(/_/g, " ");
}

function getStatusClass(status?: string | null) {
  const normalized = status?.toLowerCase() || "terjadwal";

  return `public-status public-status-${normalized}`;
}

async function getPublicJadwalSidang() {
  const response = await api.get<PublicJadwalResponse>("/public/jadwal-sidang");

  if (Array.isArray(response.data)) {
    return response.data;
  }

  return response.data.data ?? [];
}

export default function PublicDashboard() {
  const { user } = useAuth();

  const isLoggedIn = Boolean(user);

  const jadwalQuery = useQuery({
    queryKey: ["public-jadwal-sidang"],
    queryFn: getPublicJadwalSidang,
    staleTime: 60_000
  });

  const schedules = jadwalQuery.data ?? [];

  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }, []);

  const todayEnd = useMemo(() => {
    const date = new Date();
    date.setHours(23, 59, 59, 999);
    return date.getTime();
  }, []);

  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      const aTime = getDateValue(a.waktuMulai || a.tanggal);
      const bTime = getDateValue(b.waktuMulai || b.tanggal);

      return aTime - bTime;
    });
  }, [schedules]);

  const upcomingSchedules = useMemo(() => {
    return sortedSchedules.filter((item) => {
      const time = getDateValue(item.waktuMulai || item.tanggal);
      return time >= todayStart;
    });
  }, [sortedSchedules, todayStart]);

  const displayedSchedules =
    upcomingSchedules.length > 0 ? upcomingSchedules : sortedSchedules;

  const totalJadwal = schedules.length;

  const jadwalHariIni = schedules.filter((item) => {
    const time = getDateValue(item.waktuMulai || item.tanggal);
    return time >= todayStart && time <= todayEnd;
  }).length;

  const jadwalMendatang = upcomingSchedules.length;

  const totalRuang = new Set(
    schedules
      .map((item) => getRoomName(item))
      .filter((item) => item !== "Belum ditentukan")
  ).size;

  return (
    <main className="public-dashboard-page">
      <header className="public-dashboard-header">
        <div className="public-brand">
          <div className="public-brand-mark">S</div>
          <div>
            <p className="eyebrow">Universitas Pancasila</p>
            <h1>Sisidang</h1>
            <p className="muted">
              Sistem Administrasi Skripsi Universitas Pancasila.
            </p>
          </div>
        </div>

        <div className="public-dashboard-actions">
          {isLoggedIn ? (
            <>
              <span className="public-user-chip">
                {user?.name || "User"}
              </span>

              <Link to="/app" className="public-login-button">
                Masuk Dashboard
              </Link>
            </>
          ) : (
            <Link to="/login" className="public-login-button">
              Login
            </Link>
          )}
        </div>
      </header>

      <section className="public-hero">
        <div>
          <p className="eyebrow">Dashboard Publik</p>
          <h2>Informasi Jadwal Sidang Skripsi</h2>
          <p>
            Pantau jadwal sidang skripsi secara terbuka. Mahasiswa, dosen, dan
            pihak program studi dapat melihat agenda sidang tanpa harus login.
          </p>

          <div className="public-hero-actions">
            {isLoggedIn ? (
              <Link to="/app" className="primary-public-button">
                Buka Dashboard Saya
              </Link>
            ) : (
              <Link to="/login" className="primary-public-button">
                Login ke Sistem
              </Link>
            )}

            <a href="#jadwal-sidang" className="secondary-public-button">
              Lihat Jadwal
            </a>
          </div>
        </div>

        <div className="public-hero-card">
          <span>Workflow</span>
          <strong>End-to-End</strong>
          <p>
            Seminar proposal, bimbingan, sidang, revisi, finalisasi, laporan,
            dan audit log dalam satu sistem.
          </p>
        </div>
      </section>

      <section className="public-stats-grid">
        <article className="public-stat-card">
          <small>Total Jadwal</small>
          <strong>{totalJadwal}</strong>
          <span>Jadwal sidang tercatat</span>
        </article>

        <article className="public-stat-card">
          <small>Hari Ini</small>
          <strong>{jadwalHariIni}</strong>
          <span>Sidang berlangsung hari ini</span>
        </article>

        <article className="public-stat-card">
          <small>Mendatang</small>
          <strong>{jadwalMendatang}</strong>
          <span>Jadwal yang akan datang</span>
        </article>

        <article className="public-stat-card">
          <small>Ruang</small>
          <strong>{totalRuang}</strong>
          <span>Ruang digunakan</span>
        </article>
      </section>

      <section id="jadwal-sidang" className="public-section">
        <div className="public-section-header">
          <div>
            <p className="eyebrow">Agenda</p>
            <h2>Jadwal Sidang Publik</h2>
            <p className="muted">
              Data berikut otomatis diambil dari jadwal sidang yang telah
              dibuat oleh admin atau koordinator.
            </p>
          </div>

          <Link to="/login" className="small-public-link">
            Login untuk akses lengkap
          </Link>
        </div>

        {jadwalQuery.isLoading ? (
          <div className="public-state-card">
            <div className="spinner" />
            <p>Memuat jadwal sidang...</p>
          </div>
        ) : jadwalQuery.isError ? (
          <div className="public-state-card public-error-card">
            <strong>Jadwal gagal dimuat</strong>
            <p>
              Pastikan backend berjalan dan endpoint public jadwal sidang aktif.
            </p>
          </div>
        ) : displayedSchedules.length === 0 ? (
          <div className="public-state-card">
            <strong>Belum ada jadwal sidang</strong>
            <p>
              Jadwal sidang akan tampil setelah admin atau koordinator membuat
              jadwal.
            </p>
          </div>
        ) : (
          <div className="public-schedule-grid">
            {displayedSchedules.slice(0, 8).map((item, index) => (
              <article
                key={item.id || `${item.waktuMulai}-${index}`}
                className="public-schedule-card"
              >
                <div className="public-schedule-top">
                  <span className={getStatusClass(item.status)}>
                    {getStatusLabel(item.status)}
                  </span>

                  <small>{item.tipeSidang || "Sidang Skripsi"}</small>
                </div>

                <h3>{getSkripsiTitle(item)}</h3>

                <p className="public-schedule-student">
                  {getMahasiswaName(item)}
                </p>

                <div className="public-schedule-meta">
                  <div>
                    <small>Tanggal</small>
                    <strong>
                      {formatDateTime(item.waktuMulai || item.tanggal)}
                    </strong>
                  </div>

                  <div>
                    <small>Waktu</small>
                    <strong>
                      {formatTime(item.waktuMulai)} -{" "}
                      {formatTime(item.waktuSelesai)}
                    </strong>
                  </div>

                  <div>
                    <small>Ruang</small>
                    <strong>{getRoomName(item)}</strong>
                  </div>
                </div>

                {item.linkVicon ? (
                  <a
                    href={item.linkVicon}
                    target="_blank"
                    rel="noreferrer"
                    className="public-vicon-link"
                  >
                    Link Vicon
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="public-section">
        <div className="public-section-header">
          <div>
            <p className="eyebrow">Akses Sistem</p>
            <h2>Role Pengguna</h2>
            <p className="muted">
              Setelah login, sidebar dan fitur akan menyesuaikan role dan
              permission masing-masing pengguna.
            </p>
          </div>
        </div>

        <div className="public-role-grid">
          {roleInfo.map((item) => (
            <article key={item.role} className="public-role-card">
              <strong>{item.role}</strong>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="public-section public-info-section">
        <article>
          <strong>RBAC Permission-Based</strong>
          <p>
            Menu dan endpoint dilindungi berdasarkan permission, sehingga setiap
            user hanya melihat fitur yang sesuai dengan role-nya.
          </p>
        </article>

        <article>
          <strong>Upload Berkas PDF</strong>
          <p>
            Proposal, presentasi, revisi, final skripsi, dan pengesahan dapat
            diupload serta diunduh sesuai hak akses.
          </p>
        </article>

        <article>
          <strong>Laporan & Audit Log</strong>
          <p>
            Sistem menyediakan laporan akademik, export Excel/PDF, dan audit log
            untuk aktivitas penting.
          </p>
        </article>
      </section>
    </main>
  );
}