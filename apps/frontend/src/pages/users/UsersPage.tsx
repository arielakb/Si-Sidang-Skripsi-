import { useState } from "react";
import type { FormEvent } from "react";
import type { ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignUserRoles,
  createUser,
  getUsers,
  updateUserStatus
} from "../../services/users";
import StatusBadge from "../../components/ui/StatusBadge";
import RoleBadge from "../../components/ui/RoleBadge";

const availableRoles = [
  "mahasiswa",
  "dosen_reguler",
  "dosen_pembimbing",
  "dosen_penguji",
  "dosen_koordinator",
  "ketua_prodi",
  "staf_prodi",
  "admin"
];

export default function UsersPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    identifier: "",
    name: "",
    email: "",
    password: "Password123!",
    roleSlugs: ["mahasiswa"]
  });

  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: getUsers
  });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setForm({
        identifier: "",
        name: "",
        email: "",
        password: "Password123!",
        roleSlugs: ["mahasiswa"]
      });
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      status
    }: {
      userId: string;
      status: "ACTIVE" | "INACTIVE";
    }) => updateUserStatus(userId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  const assignRolesMutation = useMutation({
    mutationFn: ({
      userId,
      roleSlugs
    }: {
      userId: string;
      roleSlugs: string[];
    }) => assignUserRoles(userId, { roleSlugs }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });

  function handleRoleChange(event: ChangeEvent<HTMLSelectElement>) {
    const values = Array.from(event.target.selectedOptions).map(
      (option) => option.value
    );

    setForm((current) => ({
      ...current,
      roleSlugs: values
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createMutation.mutate({
      identifier: form.identifier,
      name: form.name,
      email: form.email || undefined,
      password: form.password,
      roleSlugs: form.roleSlugs
    });
  }

  const users = usersQuery.data ?? [];

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Admin</p>
        <h1>User Management</h1>
        <p className="muted">
          Kelola akun, status, dan multi-role pengguna Sisidang.
        </p>
      </div>

      <form className="card form-grid" onSubmit={handleSubmit}>
        <label>
          <span>Identifier</span>
          <input
            value={form.identifier}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                identifier: event.target.value
              }))
            }
            placeholder="NPM / NIP / username"
            required
          />
        </label>

        <label>
          <span>Nama</span>
          <input
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                name: event.target.value
              }))
            }
            placeholder="Nama lengkap"
            required
          />
        </label>

        <label>
          <span>Email</span>
          <input
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                email: event.target.value
              }))
            }
            placeholder="email@example.com"
          />
        </label>

        <label>
          <span>Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                password: event.target.value
              }))
            }
            required
          />
        </label>

        <label>
          <span>Role</span>
          <select multiple value={form.roleSlugs} onChange={handleRoleChange}>
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <small className="muted">Gunakan Ctrl/Command untuk pilih banyak role.</small>
        </label>

        <div className="form-actions">
          <button className="primary-button" type="submit">
            {createMutation.isPending ? "Menyimpan..." : "Buat User"}
          </button>
        </div>

        {createMutation.isError ? (
          <div className="alert-error">
            Gagal membuat user. Identifier/email mungkin sudah digunakan.
          </div>
        ) : null}
      </form>

      <div className="list-card">
        {usersQuery.isLoading ? (
          <p>Memuat user...</p>
        ) : users.length === 0 ? (
          <p>Belum ada user.</p>
        ) : (
          users.map((user) => {
            const roleSlugs = user.userRoles.map((item) => item.role.slug);

            return (
              <article key={user.id} className="list-item align-start">
              <div className="user-list-content">
                <strong>{user.name}</strong>

                <div className="user-list-meta">
                  <p className="muted">
                    {user.identifier} • {user.email || "-"}
                  </p>

                  <StatusBadge value={user.status} size="sm" />
                </div>

                <div className="user-role-list">
                  {roleSlugs.length > 0 ? (
                    roleSlugs.map((role) => <RoleBadge key={role} role={role} />)
                  ) : (
                    <span className="muted">Belum ada role</span>
                  )}
                </div>
              </div>

                <div className="row-actions">
                  <select
                    value={user.status}
                    onChange={(event) =>
                      statusMutation.mutate({
                        userId: user.id,
                        status: event.target.value as "ACTIVE" | "INACTIVE"
                      })
                    }
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>

                  <select
                    multiple
                    defaultValue={roleSlugs}
                    onBlur={(event) => {
                      const selected = Array.from(
                        event.currentTarget.selectedOptions
                      ).map((option) => option.value);

                      assignRolesMutation.mutate({
                        userId: user.id,
                        roleSlugs: selected
                      });
                    }}
                  >
                    {availableRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}