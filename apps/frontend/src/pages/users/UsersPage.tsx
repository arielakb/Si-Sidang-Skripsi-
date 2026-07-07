import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DataTable from "../../components/ui/DataTable";
import FilterToolbar from "../../components/ui/FilterToolbar";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  assignUserRoles,
  createUser,
  deleteUserPermanent,
  getUsers,
  updateUserStatus
} from "../../services/users";
import type { UserItem } from "../../types/admin";
import { getApiErrorMessage } from "../../utils/apiError";
import { useAuth } from "../../auth/AuthContext";

type DrawerMode = "create" | "detail" | null;

type UserStatus = "ACTIVE" | "INACTIVE";

type UserRow = UserItem & {
  id: string;
  identifier: string;
  name: string;
  email?: string | null;
  status: string;
  userRoles: Array<{
    role: {
      id?: string;
      slug: string;
      name?: string | null;
    };
  }>;
};

const roleOptions = [
  {
    slug: "admin",
    label: "Admin"
  },
  {
    slug: "mahasiswa",
    label: "Mahasiswa"
  },
  {
    slug: "dosen_reguler",
    label: "Dosen Reguler"
  },
  {
    slug: "dosen_pembimbing",
    label: "Dosen Pembimbing"
  },
  {
    slug: "dosen_penguji",
    label: "Dosen Penguji"
  },
  {
    slug: "dosen_koordinator",
    label: "Dosen Koordinator"
  },
  {
    slug: "ketua_prodi",
    label: "Ketua Prodi"
  },
  {
    slug: "staf_prodi",
    label: "Staf Prodi"
  }
];

const emptyForm = {
  identifier: "",
  name: "",
  email: "",
  password: "",
  roleSlugs: [] as string[]
};

function getRoleSlugs(user?: UserRow | null) {
  return user?.userRoles?.map((item) => item.role.slug) ?? [];
}

function getRoleLabels(roleSlugs: string[]) {
  return roleSlugs
    .map((slug) => roleOptions.find((item) => item.slug === slug)?.label || slug)
    .join(", ");
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function UsersPage() {
  const queryClient = useQueryClient();

  const { user: currentUser, hasPermission } = useAuth();

  const canCreateUser = hasPermission("user.create");
  const canUpdateUser = hasPermission("user.update");
  const canAssignRole = hasPermission("user.assign_role");
  const canDeletePermanent = hasPermission("user.delete_permanent");

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [selectedRoleSlugs, setSelectedRoleSlugs] = useState<string[]>([]);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: getUsers
  });

  const users = (usersQuery.data ?? []) as UserRow[];

  const filteredUsers = useMemo(() => {
    const keyword = search.toLowerCase();

    return users.filter((user) => {
      const roleSlugs = getRoleSlugs(user);

      const matchesSearch = `${user.name} ${user.identifier} ${user.email ?? ""
        } ${roleSlugs.join(" ")} ${user.status}`
        .toLowerCase()
        .includes(keyword);

      const matchesRole = roleFilter ? roleSlugs.includes(roleFilter) : true;
      const matchesStatus = statusFilter ? user.status === statusFilter : true;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const createMutation = useMutation({
    mutationFn: () =>
      createUser({
        identifier: form.identifier.trim(),
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
        roleSlugs: form.roleSlugs
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"]
      });

      setForm(emptyForm);
      closeDrawer();
      setPageError("");
      setSuccessMessage("User berhasil dibuat.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal membuat user. Identifier/email mungkin sudah digunakan."
        )
      );
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      status
    }: {
      userId: string;
      status: UserStatus;
    }) =>
      updateUserStatus(userId, {
        status
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"]
      });

      setPageError("");
      setSuccessMessage("Status user berhasil diperbarui.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal mengubah status user."));
    }
  });

  const rolesMutation = useMutation({
    mutationFn: ({
      userId,
      roleSlugs
    }: {
      userId: string;
      roleSlugs: string[];
    }) =>
      assignUserRoles(userId, {
        roleSlugs
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"]
      });

      closeDrawer();
      setPageError("");
      setSuccessMessage("Role user berhasil diperbarui.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal memperbarui role user."));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteUserPermanent(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["users"]
      });

      closeDrawer();
      setPageError("");
      setSuccessMessage("User berhasil dihapus permanen.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal menghapus permanen user. Jika user punya data akademik, gunakan Nonaktifkan."
        )
      );
    }
  });

  function openCreateDrawer() {
    setDrawerMode("create");
    setSelectedUser(null);
    setSelectedRoleSlugs([]);
    setForm(emptyForm);
    setPageError("");
    setSuccessMessage("");
  }

  function openDetailDrawer(user: UserRow) {
    setDrawerMode("detail");
    setSelectedUser(user);
    setSelectedRoleSlugs(getRoleSlugs(user));
    setForm(emptyForm);
    setPageError("");
    setSuccessMessage("");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedUser(null);
    setSelectedRoleSlugs([]);
    setForm(emptyForm);
    setPageError("");
  }

  function handleFormChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  function toggleCreateRole(roleSlug: string) {
    setForm((current) => {
      const hasRole = current.roleSlugs.includes(roleSlug);

      return {
        ...current,
        roleSlugs: hasRole
          ? current.roleSlugs.filter((slug) => slug !== roleSlug)
          : [...current.roleSlugs, roleSlug]
      };
    });
  }

  function toggleSelectedUserRole(roleSlug: string) {
    setSelectedRoleSlugs((current) => {
      const hasRole = current.includes(roleSlug);

      return hasRole
        ? current.filter((slug) => slug !== roleSlug)
        : [...current, roleSlug];
    });
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPageError("");
    setSuccessMessage("");

    if (!form.identifier.trim()) {
      setPageError("Identifier wajib diisi.");
      return;
    }

    if (!form.name.trim()) {
      setPageError("Nama wajib diisi.");
      return;
    }

    if (form.password.length < 8) {
      setPageError("Password minimal 8 karakter.");
      return;
    }

    if (form.roleSlugs.length === 0) {
      setPageError("Pilih minimal satu role.");
      return;
    }

    createMutation.mutate();
  }

  function handleSaveRoles() {
    if (!selectedUser) return;

    if (selectedRoleSlugs.length === 0) {
      setPageError("User harus memiliki minimal satu role.");
      return;
    }

    rolesMutation.mutate({
      userId: selectedUser.id,
      roleSlugs: selectedRoleSlugs
    });
  }

  function handleToggleStatus(user: UserRow) {
    statusMutation.mutate({
      userId: user.id,
      status: user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    });
  }

  function handleDeletePermanent(user: UserRow) {
    if (currentUser?.id === user.id) {
      setPageError("Anda tidak dapat menghapus akun sendiri.");
      return;
    }

    const confirmed = window.confirm(
      `Hapus permanen user "${user.name}"? Data yang sudah dihapus tidak dapat dikembalikan.`
    );

    if (!confirmed) return;

    setPageError("");
    setSuccessMessage("");
    deleteMutation.mutate(user.id);
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Administrasi"
        title="User Management"
        description="Kelola akun pengguna, status akun, dan role akses sistem Sisidang."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !drawerMode ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card users-table-card">
        <DataTable
          data={filteredUsers}
          isLoading={usersQuery.isLoading}
          emptyMessage="Belum ada user sesuai filter"
          toolbar={
            <FilterToolbar
              title="Daftar User"
              description="List akun pengguna berdasarkan identifier, email, role, dan status."
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Cari nama, NPM/NIP, email..."
              action={
                canCreateUser ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={openCreateDrawer}
                  >
                    Tambah User
                  </button>
                ) : null
              }
            >
              <div className="filter-field">
                <label>Role</label>
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                >
                  <option value="">Semua Role</option>
                  {roleOptions.map((role) => (
                    <option key={role.slug} value={role.slug}>
                      {role.label}
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
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </FilterToolbar>
          }
          columns={[
            {
              key: "no",
              header: "No",
              align: "center",
              render: (_item, index) => index + 1
            },
            {
              key: "name",
              header: "Nama",
              render: (user) => (
                <div className="table-title-cell">
                  <strong>{user.name}</strong>
                  <span>{user.email || "-"}</span>
                </div>
              )
            },
            {
              key: "identifier",
              header: "Identifier",
              render: (user) => user.identifier
            },
            {
              key: "roles",
              header: "Role",
              render: (user) => (
                <div className="user-role-chip-list">
                  {getRoleSlugs(user).length === 0 ? (
                    <span className="muted">Belum ada role</span>
                  ) : (
                    getRoleSlugs(user).map((slug) => (
                      <span key={slug} className="user-role-chip">
                        {roleOptions.find((role) => role.slug === slug)
                          ?.label || slug}
                      </span>
                    ))
                  )}
                </div>
              )
            },
            {
              key: "status",
              header: "Status",
              align: "center",
              render: (user) => <StatusBadge value={user.status} size="sm" />
            },
            {
              key: "actions",
              header: "Aksi",
              align: "right",
              render: (user) => (
                <div className="table-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => openDetailDrawer(user)}
                  >
                    Detail
                  </button>

                  {canUpdateUser ? (
                    <button
                      type="button"
                      className={
                        user.status === "ACTIVE"
                          ? "danger-button"
                          : "primary-button"
                      }
                      disabled={
                        statusMutation.isPending ||
                        currentUser?.id === user.id
                      }
                      onClick={() => handleToggleStatus(user)}
                      title={
                        currentUser?.id === user.id
                          ? "Tidak dapat menonaktifkan akun sendiri"
                          : undefined
                      }
                    >
                      {user.status === "ACTIVE" ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                  ) : null}

                  {canDeletePermanent ? (
                    <button
                      type="button"
                      className="danger-button"
                      disabled={
                        deleteMutation.isPending ||
                        currentUser?.id === user.id
                      }
                      onClick={() => handleDeletePermanent(user)}
                      title={
                        currentUser?.id === user.id
                          ? "Tidak dapat menghapus akun sendiri"
                          : undefined
                      }
                    >
                      Hapus Permanen
                    </button>
                  ) : null}
                </div>
              )
            }
          ]}
        />
      </section>

      {drawerMode ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside className="crud-drawer users-drawer" aria-label="User drawer">
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">
                  {drawerMode === "create" ? "Tambah Data" : "Detail Data"}
                </p>
                <h2>
                  {drawerMode === "create" ? "Tambah User" : "Detail User"}
                </h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closeDrawer}
              >
                Tutup
              </button>
            </div>

            {pageError ? <div className="alert-error">{pageError}</div> : null}

            {drawerMode === "create" ? (
              <form className="form-stack" onSubmit={handleCreateSubmit}>
                <label>
                  <span>Identifier</span>
                  <input
                    name="identifier"
                    value={form.identifier}
                    onChange={handleFormChange}
                    placeholder="NPM / NIP / username"
                    required
                  />
                </label>

                <label>
                  <span>Nama</span>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="Nama lengkap"
                    required
                  />
                </label>

                <label>
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="email@domain.com"
                  />
                </label>

                <label>
                  <span>Password</span>
                  <input
                    name="password"
                    type="password"
                    value={form.password}
                    onChange={handleFormChange}
                    placeholder="Minimal 8 karakter"
                    required
                  />
                </label>

                <div className="drawer-section">
                  <h3>Role User</h3>

                  <div className="role-check-grid">
                    {roleOptions.map((role) => (
                      <label key={role.slug} className="role-check-item">
                        <input
                          type="checkbox"
                          checked={form.roleSlugs.includes(role.slug)}
                          onChange={() => toggleCreateRole(role.slug)}
                        />
                        <span>{role.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Menyimpan..." : "Buat User"}
                </button>
              </form>
            ) : selectedUser ? (
              <div className="page-stack">
                <div className="workflow-history-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <p className="eyebrow" style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                      {selectedUser.identifier || "-"}
                    </p>
                    <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "4px", color: "var(--on-surface)" }}>
                      {selectedUser.name}
                    </h2>
                    <p className="muted" style={{ color: "var(--on-surface-variant)", fontSize: "14px" }}>
                      {selectedUser.email || "Tanpa email"}
                    </p>
                  </div>

                  <div className="workflow-final-status" style={{ textAlign: "right" }}>
                    <StatusBadge value={selectedUser.status} size="md" />
                    <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--on-surface-variant)", fontWeight: 600 }}>
                      Manajemen User
                    </div>
                  </div>
                </div>

                <div className="workflow-progress-track" style={{ height: "4px", backgroundColor: "var(--surface-container-high)", borderRadius: "4px", overflow: "hidden", marginBottom: "24px" }}>
                  <span style={{ display: "block", height: "100%", width: "100%", backgroundColor: "var(--primary)" }} />
                </div>

                <DataTable<any>
                  data={[
                    { label: "Identifier", value: selectedUser.identifier },
                    { label: "Email", value: selectedUser.email || "-" },
                    { label: "Status", value: selectedUser.status },
                    { label: "Role Saat Ini", value: getRoleLabels(getRoleSlugs(selectedUser)) || "-" },
                    { label: "Dibuat", value: formatDate(selectedUser.createdAt) }
                  ]}
                  columns={[
                    { key: "label", header: "Informasi", width: "40%", render: (item) => <strong>{item.label}</strong> },
                    { key: "value", header: "Detail", render: (item) => item.value }
                  ]}
                  compact
                  emptyMessage="Tidak ada data."
                  getRowKey={(item) => item.label}
                />

                {canAssignRole ? (
                  <div className="drawer-section">
                    <h3>Atur Role</h3>

                    <div className="role-check-grid">
                      {roleOptions.map((role) => (
                        <label key={role.slug} className="role-check-item">
                          <input
                            type="checkbox"
                            checked={selectedRoleSlugs.includes(role.slug)}
                            onChange={() => toggleSelectedUserRole(role.slug)}
                          />
                          <span>{role.label}</span>
                        </label>
                      ))}
                    </div>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={rolesMutation.isPending}
                      onClick={handleSaveRoles}
                    >
                      {rolesMutation.isPending
                        ? "Menyimpan..."
                        : "Simpan Role"}
                    </button>
                  </div>
                ) : null}

                {canUpdateUser ? (
                  <div className="drawer-section">
                    <h3>Status Akun</h3>

                    <button
                      type="button"
                      className={
                        selectedUser.status === "ACTIVE"
                          ? "danger-button"
                          : "primary-button"
                      }
                      disabled={
                        statusMutation.isPending ||
                        currentUser?.id === selectedUser.id
                      }
                      onClick={() => handleToggleStatus(selectedUser)}
                    >
                      {selectedUser.status === "ACTIVE"
                        ? "Nonaktifkan User"
                        : "Aktifkan User"}
                    </button>
                  </div>
                ) : null}
                {canDeletePermanent ? (
                  <div className="drawer-section danger-zone">
                    <h3>Hapus Permanen</h3>
                    <p className="muted">
                      Hapus permanen hanya bisa dilakukan jika user belum memiliki data akademik.
                      Jika user sudah pernah digunakan pada skripsi, bimbingan, berkas, atau nilai,
                      gunakan Nonaktifkan.
                    </p>

                    <button
                      type="button"
                      className="danger-button"
                      disabled={
                        deleteMutation.isPending ||
                        currentUser?.id === selectedUser.id
                      }
                      onClick={() => handleDeletePermanent(selectedUser)}
                    >
                      {deleteMutation.isPending ? "Menghapus..." : "Hapus Permanen User"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}