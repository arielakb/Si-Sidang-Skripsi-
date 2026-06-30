import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DataTable from "../../components/ui/DataTable";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  createPeminatan,
  createRuang,
  deletePeminatanPermanent,
  deleteRuangPermanent,
  getPeminatan,
  getRuang,
  updatePeminatan,
  updateRuang
} from "../../services/masterData";
import type { MasterRuang, Peminatan } from "../../types/admin";
import { getApiErrorMessage } from "../../utils/apiError";
import { useAuth } from "../../auth/AuthContext";

type ActiveTab = "peminatan" | "ruang";
type FormMode = "create" | "edit";

const emptyPeminatanForm = {
  slug: "",
  name: "",
  description: "",
  isActive: true
};

const emptyRuangForm = {
  code: "",
  name: "",
  type: "",
  capacity: "",
  facilities: "",
  isActive: true
};

export default function MasterDataPage() {
  const queryClient = useQueryClient();

  const { hasRole, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>("peminatan");
  const [search, setSearch] = useState("");
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [editingPeminatanId, setEditingPeminatanId] = useState("");
  const [peminatanForm, setPeminatanForm] = useState(emptyPeminatanForm);

  const [editingRuangId, setEditingRuangId] = useState("");
  const [ruangForm, setRuangForm] = useState(emptyRuangForm);

  const canAccessMasterData = hasRole([
    "admin",
    "dosen_koordinator",
    "ketua_prodi"
  ]);

  const canManagePeminatan = hasPermission("master_data.manage");
  const canManageRuang = hasPermission("ruang.manage");
  const canDeletePermanent = hasPermission("master_data.delete_permanent");

  const canManageActiveTab =
    activeTab === "peminatan" ? canManagePeminatan : canManageRuang;


  const peminatanQuery = useQuery({
    queryKey: ["peminatan", "include-inactive"],
    queryFn: () => getPeminatan({ includeInactive: true }),
    enabled: canAccessMasterData
  });

  const ruangQuery = useQuery({
    queryKey: ["ruang", "include-inactive"],
    queryFn: () => getRuang({ includeInactive: true }),
    enabled: canAccessMasterData
  });

  const peminatanRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return (peminatanQuery.data ?? []).filter((item) =>
      `${item.slug} ${item.name} ${item.description ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [peminatanQuery.data, search]);

  const ruangRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return (ruangQuery.data ?? []).filter((item) =>
      `${item.code} ${item.name} ${item.type ?? ""} ${item.facilities ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [ruangQuery.data, search]);

  const savePeminatanMutation = useMutation({
    mutationFn: () => {
      const payload = {
        slug: peminatanForm.slug.trim(),
        name: peminatanForm.name.trim(),
        description: peminatanForm.description.trim() || undefined,
        isActive: peminatanForm.isActive
      };

      if (editingPeminatanId) {
        return updatePeminatan(editingPeminatanId, payload);
      }

      return createPeminatan(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["peminatan"] });
            queryClient.invalidateQueries({ queryKey: ["peminatan", "include-inactive"] });

      closeForm();
      setSuccessMessage(
        formMode === "edit"
          ? "Peminatan berhasil diperbarui."
          : "Peminatan berhasil ditambahkan."
      );
    },
    onError: (error) => {
      setSuccessMessage("");
      setFormError(getApiErrorMessage(error, "Gagal menyimpan peminatan."));
    }
  });

  const saveRuangMutation = useMutation({
    mutationFn: () => {
      const payload = {
        code: ruangForm.code.trim(),
        name: ruangForm.name.trim(),
        type: ruangForm.type.trim() || undefined,
        capacity: ruangForm.capacity ? Number(ruangForm.capacity) : undefined,
        facilities: ruangForm.facilities.trim() || undefined,
        isActive: ruangForm.isActive
      };

      if (editingRuangId) {
        return updateRuang(editingRuangId, payload);
      }

      return createRuang(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ruang"] });
            queryClient.invalidateQueries({ queryKey: ["ruang", "include-inactive"] });

      closeForm();
      setSuccessMessage(
        formMode === "edit"
          ? "Ruang berhasil diperbarui."
          : "Ruang berhasil ditambahkan."
      );
    },
    onError: (error) => {
      setSuccessMessage("");
      setFormError(getApiErrorMessage(error, "Gagal menyimpan ruang."));
    }
  });

  const togglePeminatanStatusMutation = useMutation({
    mutationFn: (item: Peminatan) =>
      updatePeminatan(item.id, {
        slug: item.slug,
        name: item.name,
        description: item.description ?? undefined,
        isActive: !item.isActive
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["peminatan"] });
            queryClient.invalidateQueries({ queryKey: ["peminatan", "include-inactive"] });
      setSuccessMessage("Status peminatan berhasil diperbarui.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setFormError(getApiErrorMessage(error, "Gagal mengubah status peminatan."));
    }
  });

  const toggleRuangStatusMutation = useMutation({
    mutationFn: (item: MasterRuang) =>
      updateRuang(item.id, {
        code: item.code,
        name: item.name,
        type: item.type ?? undefined,
        capacity: item.capacity ?? undefined,
        facilities: item.facilities ?? undefined,
        isActive: !item.isActive
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ruang"] });
      setSuccessMessage("Status ruang berhasil diperbarui.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setFormError(getApiErrorMessage(error, "Gagal mengubah status ruang."));
    }
  });

  const deletePeminatanMutation = useMutation({
    mutationFn: (item: Peminatan) => deletePeminatanPermanent(item.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["peminatan"] }),
        queryClient.invalidateQueries({
          queryKey: ["peminatan", "include-inactive"]
        })
      ]);

      setSuccessMessage("Peminatan berhasil dihapus permanen.");
      setFormError("");
    },
    onError: (error) => {
      setSuccessMessage("");
      setFormError(
        getApiErrorMessage(
          error,
          "Gagal menghapus permanen peminatan. Jika sudah digunakan, nonaktifkan saja."
        )
      );
    }
  });

  const deleteRuangMutation = useMutation({
    mutationFn: (item: MasterRuang) => deleteRuangPermanent(item.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ruang"] }),
        queryClient.invalidateQueries({
          queryKey: ["ruang", "include-inactive"]
        })
      ]);

      setSuccessMessage("Ruang berhasil dihapus permanen.");
      setFormError("");
    },
    onError: (error) => {
      setSuccessMessage("");
      setFormError(
        getApiErrorMessage(
          error,
          "Gagal menghapus permanen ruang. Jika sudah digunakan, nonaktifkan saja."
        )
      );
    }
  });

  function resetMessages() {
    setFormError("");
    setSuccessMessage("");
  }

  function openCreateForm() {
    resetMessages();
    setFormMode("create");
    setEditingPeminatanId("");
    setEditingRuangId("");
    setPeminatanForm(emptyPeminatanForm);
    setRuangForm(emptyRuangForm);
    setIsFormOpen(true);
  }

  function closeForm() {
    setIsFormOpen(false);
    setFormError("");
    setEditingPeminatanId("");
    setEditingRuangId("");
    setPeminatanForm(emptyPeminatanForm);
    setRuangForm(emptyRuangForm);
  }

  function handleEditPeminatan(item: Peminatan) {
    resetMessages();
    setActiveTab("peminatan");
    setFormMode("edit");
    setEditingPeminatanId(item.id);
    setPeminatanForm({
      slug: item.slug,
      name: item.name,
      description: item.description ?? "",
      isActive: item.isActive
    });
    setIsFormOpen(true);
  }

  function handleEditRuang(item: MasterRuang) {
    resetMessages();
    setActiveTab("ruang");
    setFormMode("edit");
    setEditingRuangId(item.id);
    setRuangForm({
      code: item.code,
      name: item.name,
      type: item.type ?? "",
      capacity: item.capacity ? String(item.capacity) : "",
      facilities: item.facilities ?? "",
      isActive: item.isActive
    });
    setIsFormOpen(true);
  }

  function handleDeletePeminatan(item: Peminatan) {
    const confirmed = window.confirm(
      `Hapus permanen peminatan "${item.name}"? Data yang sudah terhapus tidak bisa dikembalikan.`
    );

    if (!confirmed) return;

    resetMessages();
    deletePeminatanMutation.mutate(item);
  }

  function handleDeleteRuang(item: MasterRuang) {
    const confirmed = window.confirm(
      `Hapus permanen ruang "${item.name}"? Data yang sudah terhapus tidak bisa dikembalikan.`
    );

    if (!confirmed) return;

    resetMessages();
    deleteRuangMutation.mutate(item);
  }

  function handleSubmitPeminatan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!peminatanForm.slug.trim() || !peminatanForm.name.trim()) {
      setFormError("Slug dan nama peminatan wajib diisi.");
      return;
    }

    savePeminatanMutation.mutate();
  }

  function handleSubmitRuang(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();

    if (!ruangForm.code.trim() || !ruangForm.name.trim()) {
      setFormError("Kode dan nama ruang wajib diisi.");
      return;
    }

    if (ruangForm.capacity && Number(ruangForm.capacity) < 1) {
      setFormError("Kapasitas ruang harus lebih dari 0.");
      return;
    }

    saveRuangMutation.mutate();
  }

  const isLoading = peminatanQuery.isLoading || ruangQuery.isLoading;

  if (!canAccessMasterData) {
    return (
      <section className="page-stack">
        <div className="alert-error">
          Anda tidak memiliki akses ke halaman Master Data.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Master Data"
        title="Master Data Program Studi"
        description="Kelola data peminatan dan ruang Program Studi Teknik Informatika Universitas Pancasila."
      />

      <section className="master-tabs">
        <button
          type="button"
          className={activeTab === "peminatan" ? "master-tab active" : "master-tab"}
          onClick={() => {
            setActiveTab("peminatan");
            resetMessages();
          }}
        >
          Peminatan
        </button>

        <button
          type="button"
          className={activeTab === "ruang" ? "master-tab active" : "master-tab"}
          onClick={() => {
            setActiveTab("ruang");
            resetMessages();
          }}
        >
          Ruang
        </button>
      </section>

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {formError && !isFormOpen ? (
        <div className="alert-error">{formError}</div>
      ) : null}

      <section className="list-card master-list-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>
              {activeTab === "peminatan" ? "Daftar Peminatan" : "Daftar Ruang"}
            </h2>
            <p className="muted">
              {activeTab === "peminatan"
                ? "List peminatan yang tersedia untuk mahasiswa."
                : "List ruang untuk peminjaman dan penjadwalan sidang."}
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                activeTab === "peminatan" ? "Cari peminatan..." : "Cari ruang..."
              }
            />

            {canManageActiveTab ? (
              <button type="button" className="primary-button" onClick={openCreateForm}>
                {activeTab === "peminatan" ? "Tambah Peminatan" : "Tambah Ruang"}
              </button>
            ) : null}
          </div>
        </div>

        {isLoading ? (
          <div className="empty-state">
            <div>
              <strong>Memuat data...</strong>
              <p>Mohon tunggu sebentar.</p>
            </div>
          </div>
        ) : activeTab === "peminatan" ? (
          <DataTable
            data={peminatanRows}
            emptyMessage="Belum ada data peminatan"
            columns={[
              {
                key: "no",
                header: "No",
                align: "center",
                render: (_item, index) => index + 1
              },
              {
                key: "slug",
                header: "Slug",
                render: (item) => <strong>{item.slug}</strong>
              },
              {
                key: "name",
                header: "Nama Peminatan",
                render: (item) => item.name
              },
              {
                key: "description",
                header: "Deskripsi",
                render: (item) => item.description || "-"
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => (
                  <StatusBadge
                    value={item.isActive ? "ACTIVE" : "INACTIVE"}
                    size="sm"
                  />
                )
              },
              {
                key: "actions",
                header: "Aksi",
                align: "right",
                render: (item) => {
                  const hasAnyAction = canManagePeminatan || canDeletePermanent;

                  if (!hasAnyAction) {
                    return <span className="muted">-</span>;
                  }

                  return (
                    <div className="table-actions">
                      {canManagePeminatan ? (
                        <>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleEditPeminatan(item)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={item.isActive ? "danger-button" : "secondary-button"}
                            onClick={() => togglePeminatanStatusMutation.mutate(item)}
                            disabled={togglePeminatanStatusMutation.isPending}
                          >
                            {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </>
                      ) : null}

                      {canDeletePermanent ? (
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDeletePeminatan(item)}
                          disabled={deletePeminatanMutation.isPending}
                        >
                          Hapus Permanen
                        </button>
                      ) : null}
                    </div>
                  );
                }
              }
            ]}
          />
        ) : (
          <DataTable
            data={ruangRows}
            emptyMessage="Belum ada data ruang"
            columns={[
              {
                key: "no",
                header: "No",
                align: "center",
                render: (_item, index) => index + 1
              },
              {
                key: "code",
                header: "Kode",
                render: (item) => <strong>{item.code}</strong>
              },
              {
                key: "name",
                header: "Nama Ruang",
                render: (item) => item.name
              },
              {
                key: "type",
                header: "Tipe",
                render: (item) => item.type || "-"
              },
              {
                key: "capacity",
                header: "Kapasitas",
                align: "center",
                render: (item) => item.capacity || "-"
              },
              {
                key: "facilities",
                header: "Fasilitas",
                render: (item) => item.facilities || "-"
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => (
                  <StatusBadge
                    value={item.isActive ? "ACTIVE" : "INACTIVE"}
                    size="sm"
                  />
                )
              },
              {
                key: "actions",
                header: "Aksi",
                align: "right",
                render: (item) => {
                  const hasAnyAction = canManageRuang || canDeletePermanent;

                  if (!hasAnyAction) {
                    return <span className="muted">-</span>;
                  }

                  return (
                    <div className="table-actions">
                      {canManageRuang ? (
                        <>
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleEditRuang(item)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={item.isActive ? "danger-button" : "secondary-button"}
                            onClick={() => toggleRuangStatusMutation.mutate(item)}
                            disabled={toggleRuangStatusMutation.isPending}
                          >
                            {item.isActive ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                        </>
                      ) : null}

                      {canDeletePermanent ? (
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => handleDeleteRuang(item)}
                          disabled={deleteRuangMutation.isPending}
                        >
                          Hapus Permanen
                        </button>
                      ) : null}
                    </div>
                  );
                }
              }
            ]}
          />
        )}
      </section>

      {isFormOpen ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside className="crud-drawer" aria-label="Form master data">
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">
                  {formMode === "edit" ? "Edit Data" : "Tambah Data"}
                </p>
                <h2>
                  {activeTab === "peminatan"
                    ? formMode === "edit"
                      ? "Edit Peminatan"
                      : "Tambah Peminatan"
                    : formMode === "edit"
                      ? "Edit Ruang"
                      : "Tambah Ruang"}
                </h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closeForm}
              >
                Tutup
              </button>
            </div>

            {formError ? <div className="alert-error">{formError}</div> : null}

            {activeTab === "peminatan" ? (
              <form className="form-stack" onSubmit={handleSubmitPeminatan}>
                <label>
                  <span>Slug</span>
                  <input
                    value={peminatanForm.slug}
                    onChange={(event) =>
                      setPeminatanForm((current) => ({
                        ...current,
                        slug: event.target.value
                      }))
                    }
                    placeholder="contoh: ai"
                    required
                  />
                </label>

                <label>
                  <span>Nama Peminatan</span>
                  <input
                    value={peminatanForm.name}
                    onChange={(event) =>
                      setPeminatanForm((current) => ({
                        ...current,
                        name: event.target.value
                      }))
                    }
                    placeholder="Artificial Intelligence"
                    required
                  />
                </label>

                <label>
                  <span>Status</span>
                  <select
                    value={peminatanForm.isActive ? "ACTIVE" : "INACTIVE"}
                    onChange={(event) =>
                      setPeminatanForm((current) => ({
                        ...current,
                        isActive: event.target.value === "ACTIVE"
                      }))
                    }
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Nonaktif</option>
                  </select>
                </label>

                <label>
                  <span>Deskripsi</span>
                  <textarea
                    value={peminatanForm.description}
                    onChange={(event) =>
                      setPeminatanForm((current) => ({
                        ...current,
                        description: event.target.value
                      }))
                    }
                    placeholder="Deskripsi singkat peminatan"
                  />
                </label>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={savePeminatanMutation.isPending}
                >
                  {savePeminatanMutation.isPending
                    ? "Menyimpan..."
                    : formMode === "edit"
                      ? "Simpan Perubahan"
                      : "Tambah Peminatan"}
                </button>
              </form>
            ) : (
              <form className="form-stack" onSubmit={handleSubmitRuang}>
                <label>
                  <span>Kode Ruang</span>
                  <input
                    value={ruangForm.code}
                    onChange={(event) =>
                      setRuangForm((current) => ({
                        ...current,
                        code: event.target.value
                      }))
                    }
                    placeholder="R-401"
                    required
                  />
                </label>

                <label>
                  <span>Nama Ruang</span>
                  <input
                    value={ruangForm.name}
                    onChange={(event) =>
                      setRuangForm((current) => ({
                        ...current,
                        name: event.target.value
                      }))
                    }
                    placeholder="Laboratorium Informatika"
                    required
                  />
                </label>

                <label>
                  <span>Tipe</span>
                  <input
                    value={ruangForm.type}
                    onChange={(event) =>
                      setRuangForm((current) => ({
                        ...current,
                        type: event.target.value
                      }))
                    }
                    placeholder="Lab / Kelas / Sidang"
                  />
                </label>

                <label>
                  <span>Kapasitas</span>
                  <input
                    type="number"
                    min="1"
                    value={ruangForm.capacity}
                    onChange={(event) =>
                      setRuangForm((current) => ({
                        ...current,
                        capacity: event.target.value
                      }))
                    }
                    placeholder="30"
                  />
                </label>

                <label>
                  <span>Status</span>
                  <select
                    value={ruangForm.isActive ? "ACTIVE" : "INACTIVE"}
                    onChange={(event) =>
                      setRuangForm((current) => ({
                        ...current,
                        isActive: event.target.value === "ACTIVE"
                      }))
                    }
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Nonaktif</option>
                  </select>
                </label>

                <label>
                  <span>Fasilitas</span>
                  <textarea
                    value={ruangForm.facilities}
                    onChange={(event) =>
                      setRuangForm((current) => ({
                        ...current,
                        facilities: event.target.value
                      }))
                    }
                    placeholder="Proyektor, AC, papan tulis, internet"
                  />
                </label>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saveRuangMutation.isPending}
                >
                  {saveRuangMutation.isPending
                    ? "Menyimpan..."
                    : formMode === "edit"
                      ? "Simpan Perubahan"
                      : "Tambah Ruang"}
                </button>
              </form>
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}