import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import RoleBadge from "../ui/RoleBadge";
import UserAvatar from "../ui/UserAvatar";

type MenuItem = {
  key: string;
  label: string;
  to: string;
  roles?: string[];
  permissions?: string[];
};

const menuItems: MenuItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    to: "/app"
  },
  {
    key: "skripsi",
    label: "Data Skripsi",
    to: "/app/skripsi",
    permissions: ["skripsi.read"]
  },
  {
    key: "seminar-review",
    label: "Review Seminar",
    to: "/app/seminar-review",
    roles: ["admin", "dosen_penguji", "dosen_koordinator", "ketua_prodi"],
    permissions: ["skripsi.read"]
  },
  {
    key: "assign-pembimbing",
    label: "Assign Pembimbing",
    to: "/app/assign-pembimbing",
    roles: ["admin", "dosen_koordinator", "ketua_prodi", "staf_prodi"],
    permissions: ["skripsi.assign_dosen"]
  },
  {
    key: "bimbingan",
    label: "Bimbingan",
    to: "/app/bimbingan",
    permissions: ["bimbingan.read"]
  },
  {
    key: "progress",
    label: "Progress Saya",
    to: "/app/progress",
    roles: ["mahasiswa"],
    permissions: ["gamification.read"]
  },
  {
    key: "jadwal-sidang",
    label: "Jadwal Sidang",
    to: "/app/jadwal-sidang",
    permissions: ["jadwal_sidang.read"]
  },
  {
    key: "nilai-sidang",
    label: "Nilai Sidang",
    to: "/app/nilai-sidang",
    permissions: ["nilai.read"]
  },
  {
    key: "revisi-final",
    label: "Revisi & Final",
    to: "/app/revisi-final",
    permissions: [
      "revisi.create",
      "revisi.upload",
      "revisi.approve",
      "skripsi.approve_final"
    ]
  },
  {
    key: "peminjaman-ruang",
    label: "Peminjaman Ruang",
    to: "/app/peminjaman-ruang",
    permissions: ["ruang.borrow", "ruang.approve"]
  },
  {
    key: "users",
    label: "User Management",
    to: "/app/users",
    permissions: ["user.read"]
  },
  {
    key: "master-data",
    label: "Master Data",
    to: "/app/master-data",
    permissions: ["master_data.read", "master_data.manage"]
  },
  {
    key: "laporan",
    label: "Laporan",
    to: "/app/laporan",
    permissions: ["laporan.read"]
  },
  {
    key: "audit-logs",
    label: "Audit Log",
    to: "/app/audit-logs",
    permissions: ["audit.read"]
  },
  {
    key: "notifications",
    label: "Notifikasi",
    to: "/app/notifications",
    permissions: ["notification.read"]
  },
  {
    key: "leaderboard",
    label: "Leaderboard",
    to: "/app/leaderboard",
    permissions: ["gamification.read"]
  }
];

function getRoleContextLabel(roles: string[]) {
  if (roles.includes("admin")) return "Administrator";
  if (roles.includes("ketua_prodi")) return "Ketua Prodi";
  if (roles.includes("dosen_koordinator")) return "Dosen Koordinator";
  if (roles.includes("staf_prodi")) return "Staf Prodi";
  if (roles.includes("dosen_pembimbing")) return "Dosen Pembimbing";
  if (roles.includes("dosen_penguji")) return "Dosen Penguji";
  if (roles.includes("dosen_reguler")) return "Dosen Reguler";
  if (roles.includes("mahasiswa")) return "Mahasiswa";

  return "User";
}

function getMenuLabel(item: MenuItem, roles: string[]) {
  if (item.key === "skripsi" && roles.includes("mahasiswa")) {
    return "Skripsi Saya";
  }

  if (item.key === "skripsi") {
    return "Data Skripsi";
  }

  if (item.key === "bimbingan" && roles.includes("dosen_pembimbing")) {
    return "Bimbingan Mahasiswa";
  }

  return item.label;
}

function getMenuGroup(item: MenuItem) {
  if (["dashboard", "notifications"].includes(item.key)) {
    return "Utama";
  }

  if (
    [
      "skripsi",
      "seminar-review",
      "bimbingan",
      "progress",
      "jadwal-sidang",
      "nilai-sidang",
      "revisi-final"
    ].includes(item.key)
  ) {
    return "Akademik";
  }

  if (["peminjaman-ruang", "master-data", "users"].includes(item.key)) {
    return "Administrasi";
  }

  if (["laporan", "audit-logs", "leaderboard"].includes(item.key)) {
    return "Monitoring";
  }

  return "Lainnya";
}

function getCurrentPageLabel(pathname: string, roles: string[]) {
  if (pathname === "/app") return "Dashboard";

  const matched = menuItems
    .filter((item) => item.to !== "/app")
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => pathname.startsWith(item.to));

  if (!matched) return "Dashboard";

  return getMenuLabel(matched, roles);
}

export default function DashboardLayout() {
  const { user, logout, hasRole, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const roles = user?.roles ?? [];
  const roleLabel = getRoleContextLabel(roles);

  const visibleMenu = useMemo(() => {
    return menuItems.filter((item) => {
      const roleAllowed = !item.roles || hasRole(item.roles);
      const permissionAllowed =
        !item.permissions || hasPermission(item.permissions);

      return roleAllowed && permissionAllowed;
    });
  }, [hasPermission, hasRole]);

  const groupedMenu = useMemo(() => {
    return visibleMenu.reduce<Record<string, MenuItem[]>>((groups, item) => {
      const group = getMenuGroup(item);

      if (!groups[group]) {
        groups[group] = [];
      }

      groups[group].push(item);

      return groups;
    }, {});
  }, [visibleMenu]);

  const currentPageLabel = getCurrentPageLabel(location.pathname, roles);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className="dashboard-shell">
      <button
        type="button"
        className={`sidebar-overlay ${isSidebarOpen ? "show" : ""}`}
        aria-label="Tutup menu"
        onClick={closeSidebar}
      />

      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-mobile-head">
          <div className="brand">
            <div className="brand-mark">S</div>
            <div>
              <strong>Sisidang</strong>
              <small>Administrasi Skripsi</small>
            </div>
          </div>

          <button
            type="button"
            className="sidebar-close-button"
            aria-label="Tutup sidebar"
            onClick={closeSidebar}
          >
            ×
          </button>
        </div>

        <div className="sidebar-user-card sidebar-user-card-rich">
          <div className="sidebar-user-main">
            <UserAvatar name={user?.name} />
            <div>
              <small>Role aktif</small>
              <strong>{roleLabel}</strong>
            </div>
          </div>

          <div className="sidebar-role-list">
            {roles.length > 0 ? (
              roles.map((role) => <RoleBadge key={role} role={role} />)
            ) : (
              <RoleBadge role="user" />
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {Object.entries(groupedMenu).map(([group, items]) => (
            <div key={group} className="sidebar-group">
              <p>{group}</p>

              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/app"}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    isActive ? "nav-item active" : "nav-item"
                  }
                >
                  <span>{getMenuLabel(item, roles)}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <a href="/" className="public-link" onClick={closeSidebar}>
          Dashboard Publik
        </a>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Buka menu"
              onClick={() => setIsSidebarOpen(true)}
            >
              ☰
            </button>

            <div className="topbar-page">
              <p className="eyebrow">Sisidang</p>
              <strong>{currentPageLabel}</strong>
              <small>{roleLabel}</small>
            </div>
          </div>

          <div className="topbar-actions">
          <div className="topbar-user topbar-user-rich">
            <UserAvatar name={user?.name} size="sm" />
            <div>
              <small>Login sebagai</small>
              <strong>{user?.name || "User"}</strong>
            </div>
          </div>

            <button className="secondary-button logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="content-area">
          <Outlet />
        </main>
      </section>
    </div>
  );
}