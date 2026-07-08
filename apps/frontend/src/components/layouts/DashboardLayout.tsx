import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import BrandMark from "../ui/BrandMark";
import RoleBadge from "../ui/RoleBadge";
import UserAvatar from "../ui/UserAvatar";

type MenuItem = {
  key: string;
  label: string;
  to: string;
  icon: string;
  roles?: string[];
  permissions?: string[];
};

const WORKFLOW_ROLES = [
  "admin",
  "mahasiswa",
  "dosen_penguji",
  "dosen_pembimbing",
  "dosen_koordinator",
  "ketua_prodi",
  "staf_prodi"
];

const menuItems: MenuItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    to: "/app",
    icon: "dashboard"
  },
  {
    key: "workflow-dashboard",
    label: "Dashboard Workflow",
    to: "/app/workflow-dashboard",
    icon: "space_dashboard",
    roles: WORKFLOW_ROLES,
    permissions: ["sidang.read"]
  },
  {
    key: "skripsi",
    label: "Data Skripsi",
    to: "/app/skripsi",
    icon: "description",
    roles: ["admin", "mahasiswa", "dosen_koordinator", "ketua_prodi"]
  },
  {
    key: "workflow-sidang",
    label: "Workflow Sidang",
    to: "/app/workflow-sidang",
    icon: "sync_alt",
    roles: WORKFLOW_ROLES,
    permissions: ["sidang.read"]
  },
  {
    key: "progress",
    label: "Progress Akademik",
    to: "/app/progress",
    icon: "trending_up",
    roles: WORKFLOW_ROLES,
    permissions: ["sidang.read"]
  },
  {
    key: "riwayat-workflow",
    label: "Riwayat Sidang",
    to: "/app/sidang/riwayat-workflow",
    icon: "history",
    roles: WORKFLOW_ROLES,
    permissions: ["sidang.read"]
  },
  {
    key: "bimbingan",
    label: "Bimbingan",
    to: "/app/bimbingan",
    icon: "groups",
    roles: ["admin", "mahasiswa", "dosen_pembimbing"],
    permissions: ["bimbingan.read"]
  },
  {
    key: "assign-pembimbing",
    label: "Assign Pembimbing",
    to: "/app/assign-pembimbing",
    icon: "person_add",
    roles: ["admin", "dosen_koordinator", "ketua_prodi"],
    permissions: ["skripsi.assign_dosen"]
  },
  {
    key: "peminjaman-ruang",
    label: "Peminjaman Ruang",
    to: "/app/peminjaman-ruang",
    icon: "meeting_room",
    roles: ["admin", "mahasiswa", "staf_prodi"]
  },
  {
    key: "master-data",
    label: "Master Data",
    to: "/app/master-data",
    icon: "dataset",
    roles: ["admin", "dosen_koordinator", "ketua_prodi", "staf_prodi"],
    permissions: ["master_data.read"]
  },
  {
    key: "laporan",
    label: "Laporan",
    to: "/app/laporan",
    icon: "analytics",
    roles: ["admin", "dosen_koordinator", "ketua_prodi"],
    permissions: ["laporan.read"]
  },
  {
    key: "users",
    label: "User Management",
    to: "/app/users",
    icon: "manage_accounts",
    roles: ["admin", "ketua_prodi"],
    permissions: ["user.read"]
  },
  {
    key: "audit-logs",
    label: "Audit Log",
    to: "/app/audit-logs",
    icon: "manage_search",
    roles: ["admin", "ketua_prodi"],
    permissions: ["audit.read"]
  },
  {
    key: "notifications",
    label: "Notifikasi",
    to: "/app/notifications",
    icon: "notifications",
    roles: [
      "admin",
      "mahasiswa",
      "dosen_penguji",
      "dosen_pembimbing",
      "dosen_koordinator",
      "ketua_prodi",
      "staf_prodi",
      "dosen_reguler"
    ],
    permissions: ["notification.read"]
  }
];

const menuGroupOrder = [
  "Dashboard",
  "Akademik",
  "Bimbingan",
  "Administrasi",
  "Monitoring"
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
    return "Daftar Seminar Proposal";
  }

  if (item.key === "progress" && roles.includes("mahasiswa")) {
    return "Progress Saya";
  }

  if (item.key === "bimbingan" && roles.includes("dosen_pembimbing")) {
    return "Bimbingan Mahasiswa";
  }

  if (item.key === "workflow-sidang" && roles.includes("staf_prodi")) {
    return "Monitoring Workflow";
  }

  return item.label;
}

function getMenuGroup(item: MenuItem) {
  if (["dashboard", "workflow-dashboard"].includes(item.key)) {
    return "Dashboard";
  }

  if (
    ["skripsi", "workflow-sidang", "progress", "riwayat-workflow"].includes(
      item.key
    )
  ) {
    return "Akademik";
  }

  if (["bimbingan", "assign-pembimbing"].includes(item.key)) {
    return "Bimbingan";
  }

  if (
    ["master-data", "users", "peminjaman-ruang", "laporan"].includes(item.key)
  ) {
    return "Administrasi";
  }

  if (["audit-logs", "notifications"].includes(item.key)) {
    return "Monitoring";
  }

  return "Monitoring";
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
  const currentPageLabel = getCurrentPageLabel(location.pathname, roles);

  const visibleMenu = useMemo(() => {
    return menuItems.filter((item) => {
      const roleAllowed = !item.roles || hasRole(item.roles);
      const permissionAllowed =
        !item.permissions || hasPermission(item.permissions);

      return roleAllowed && permissionAllowed;
    });
  }, [hasPermission, hasRole]);

  const groupedMenu = useMemo(() => {
    const groups = visibleMenu.reduce<Record<string, MenuItem[]>>(
      (result, item) => {
        const group = getMenuGroup(item);

        if (!result[group]) {
          result[group] = [];
        }

        result[group].push(item);

        return result;
      },
      {}
    );

    return menuGroupOrder
      .filter((group) => groups[group]?.length)
      .map((group) => ({
        group,
        items: groups[group]
      }));
  }, [visibleMenu]);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className="dashboard-shell sisidang-layout">
      <button
        type="button"
        className={`sidebar-overlay ${isSidebarOpen ? "show" : ""}`}
        aria-label="Tutup menu"
        onClick={closeSidebar}
      />

      <aside className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand-wrap">
          <BrandMark />

          <button
            type="button"
            className="sidebar-close-button"
            aria-label="Tutup sidebar"
            onClick={closeSidebar}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="sidebar-user-card sidebar-user-card-rich">
          <div className="sidebar-user-main">
            <UserAvatar name={user?.name} />
            <div>
              <small>Login sebagai</small>
              <strong>{user?.name || "User"}</strong>
              <span>{roleLabel}</span>
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

        <nav className="sidebar-nav" aria-label="Navigasi aplikasi">
          {groupedMenu.map(({ group, items }) => (
            <div key={group} className="sidebar-group sidebar-menu-group">
              <p className="sidebar-section-title sidebar-menu-group-title">
                {group}
              </p>

              <div className="sidebar-menu-group-list">
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
                    <span className="nav-icon sidebar-link-icon material-symbols-outlined" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="nav-label sidebar-link-label">
                      {getMenuLabel(item, roles)}
                    </span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a href="/" className="public-link" onClick={closeSidebar}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>open_in_new</span>
            Dashboard Publik
          </a>
        </div>
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
              <span className="material-symbols-outlined">menu</span>
            </button>

            <div className="input-with-icon" style={{ width: '280px', display: 'none' }}>
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search thesis, students..." />
            </div>

            <div className="topbar-page" style={{ marginLeft: '16px' }}>
              <p className="eyebrow">Sisidang TI</p>
              <strong>{currentPageLabel}</strong>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="ghost-button" style={{ padding: '8px', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="ghost-button" style={{ padding: '8px', color: 'var(--on-surface-variant)' }}>
              <span className="material-symbols-outlined">apps</span>
            </button>

            <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--outline-variant)', margin: '0 8px' }}></div>

            <div className="topbar-user topbar-user-rich">
              <UserAvatar name={user?.name} size="sm" />
              <div>
                <strong>{user?.name || "User"}</strong>
                <small>{roleLabel}</small>
              </div>
            </div>

            <button
              type="button"
              className="ghost-button logout-button"
              onClick={handleLogout}
              title="Logout"
              style={{ padding: '8px', color: 'var(--error)' }}
            >
              <span className="material-symbols-outlined">logout</span>
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
