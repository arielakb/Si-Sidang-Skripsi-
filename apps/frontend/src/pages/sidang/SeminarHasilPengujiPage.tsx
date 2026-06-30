import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  assignPengujiSidang,
  getDosenPengujiOptions,
  getSidangList,
  type DosenOption,
  type SidangItem
} from "../../services/sidang";
import { getApiErrorMessage } from "../../utils/apiError";

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getPengujiLabels(item: SidangItem) {
  const rows = item.dosen ?? [];

  if (rows.length === 0) return "-";

  return rows
    .map((row) => `${row.peran}: ${row.dosen?.name || row.dosenId}`)
    .join(", ");
}

function getRoleLabels(dosen: DosenOption) {
  const roles = dosen.userRoles?.map((item) => item.role.slug) ?? [];
  return roles.join(", ") || "dosen";
}

function hasRequiredBerkas(item: SidangItem) {
  const kategori = new Set((item.berkas ?? []).map((berkas) => berkas.kategori));

  return kategori.has("SIDANG_SOFTCOPY") && kategori.has("SIDANG_PRESENTASI");
}

export default function SeminarHasilPengujiPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canReadSidang = hasPermission("sidang.read");
  const canAssignPenguji = hasPermission("sidang.assign_penguji");

  const [search, setSearch] = useState("");
  const [selectedSidang, setSelectedSidang] = useState<SidangItem | null>(null);
  const [selectedDosenIds, setSelectedDosenIds] = useState<string[]>([]);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sidangQuery = useQuery({
    queryKey: ["sidang", "seminar-hasil", "penguji"],
    queryFn: () =>
      getSidangList({
        jenis: "SEMINAR_HASIL",
        limit: 100
      }),
    enabled: canReadSidang
  });

  const dosenQuery = useQuery({
    queryKey: ["dosen-penguji-options"],
    queryFn: getDosenPengujiOptions,
    enabled: canAssignPenguji
  });

  const sidangRows = sidangQuery.data?.data ?? [];
  const dosenRows = dosenQuery.data ?? [];

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return sidangRows.filter((item) =>
      `${item.skripsi?.title ?? ""} ${item.skripsi?.mahasiswa?.name ?? ""} ${
        item.skripsi?.mahasiswa?.identifier ?? ""
      } ${item.status ?? ""} ${item.hasil ?? ""} ${getPengujiLabels(item)}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [sidangRows, search]);

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!selectedSidang) {
        throw new Error("Sidang belum dipilih.");
      }

      return assignPengujiSidang(selectedSidang.id, {
        dosenIds: selectedDosenIds
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-hasil", "penguji"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-hasil", "berkas"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["dosen-penguji-options"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-summary"]
        })
      ]);

      closeDrawer();
      setPageError("");
      setSuccessMessage("Dosen penguji seminar hasil berhasil ditetapkan.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal assign penguji. Pastikan jumlah penguji memenuhi aturan workflow."
        )
      );
    }
  });

  function openAssignDrawer(item: SidangItem) {
    const currentPengujiIds =
      item.dosen
        ?.filter((row) => ["PENGUJI", "KETUA_PENGUJI"].includes(row.peran))
        .map((row) => row.dosenId) ?? [];

    setSelectedSidang(item);
    setSelectedDosenIds(currentPengujiIds);
    setPageError("");
    setSuccessMessage("");
  }

  function closeDrawer() {
    setSelectedSidang(null);
    setSelectedDosenIds([]);
    setPageError("");
  }

  function toggleDosen(dosenId: string) {
    setSelectedDosenIds((current) =>
      current.includes(dosenId)
        ? current.filter((id) => id !== dosenId)
        : [...current, dosenId]
    );
  }

  function handleSubmitAssign() {
    setPageError("");
    setSuccessMessage("");

    if (selectedDosenIds.length === 0) {
      setPageError("Pilih minimal satu dosen penguji.");
      return;
    }

    assignMutation.mutate();
  }

  if (!canReadSidang) {
    return (
      <section className="page-stack">
        <div className="alert-error">
          Anda tidak memiliki akses ke halaman assign penguji seminar hasil.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Seminar Hasil"
        title="Assign Penguji Seminar Hasil"
        description="Kelola penugasan dosen penguji untuk seminar hasil setelah mahasiswa mengupload berkas."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !selectedSidang ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Daftar Seminar Hasil</h2>
            <p className="muted">
              Assign penguji dapat dilakukan setelah berkas seminar hasil lengkap.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, mahasiswa, status, penguji..."
            />
          </div>
        </div>

        {sidangQuery.isLoading ? (
          <EmptyState
            title="Memuat seminar hasil..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRows}
            emptyMessage="Belum ada data seminar hasil"
            columns={[
              {
                key: "no",
                header: "No",
                align: "center",
                render: (_item, index) => index + 1
              },
              {
                key: "skripsi",
                header: "Skripsi",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.skripsi?.title || "Tanpa judul"}</strong>
                    <span>
                      {item.skripsi?.mahasiswa?.name || "-"} •{" "}
                      {item.skripsi?.mahasiswa?.identifier || "-"}
                    </span>
                  </div>
                )
              },
              {
                key: "attempt",
                header: "Attempt",
                align: "center",
                render: (item) => item.attemptNo
              },
              {
                key: "berkas",
                header: "Berkas",
                align: "center",
                render: (item) =>
                  hasRequiredBerkas(item) ? (
                    <StatusBadge value="LENGKAP" size="sm" />
                  ) : (
                    <StatusBadge value="BELUM_LENGKAP" size="sm" />
                  )
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => <StatusBadge value={item.status} size="sm" />
              },
              {
                key: "hasil",
                header: "Hasil",
                align: "center",
                render: (item) =>
                  item.hasil ? (
                    <StatusBadge value={item.hasil} size="sm" />
                  ) : (
                    <span className="muted">-</span>
                  )
              },
              {
                key: "penguji",
                header: "Penguji",
                render: (item) => getPengujiLabels(item)
              },
              {
                key: "createdAt",
                header: "Dibuat",
                render: (item) => formatDate(item.createdAt)
              },
              {
                key: "actions",
                header: "Aksi",
                align: "right",
                render: (item) => (
                  <div className="table-actions">
                    {canAssignPenguji ? (
                      <button
                        type="button"
                        className="primary-button"
                        disabled={!hasRequiredBerkas(item)}
                        onClick={() => openAssignDrawer(item)}
                      >
                        Assign Penguji
                      </button>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </div>
                )
              }
            ]}
          />
        )}
      </section>

      {selectedSidang ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside className="crud-drawer" aria-label="Assign penguji seminar hasil">
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Seminar Hasil</p>
                <h2>Assign Dosen Penguji</h2>
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

            <div className="info-list">
              <div className="info-row">
                <span>Judul</span>
                <strong>{selectedSidang.skripsi?.title || "Tanpa judul"}</strong>
              </div>

              <div className="info-row">
                <span>Mahasiswa</span>
                <strong>{selectedSidang.skripsi?.mahasiswa?.name || "-"}</strong>
              </div>

              <div className="info-row">
                <span>Attempt</span>
                <strong>{selectedSidang.attemptNo}</strong>
              </div>

              <div className="info-row">
                <span>Status</span>
                <StatusBadge value={selectedSidang.status} size="sm" />
              </div>
            </div>

            <div className="drawer-section">
              <h3>Pilih Dosen Penguji</h3>
              <p className="muted">
                Minimal penguji divalidasi dari workflow rule backend.
              </p>

              <div className="role-check-grid">
                {dosenRows.map((dosen) => (
                  <label key={dosen.id} className="role-check-item">
                    <input
                      type="checkbox"
                      checked={selectedDosenIds.includes(dosen.id)}
                      onChange={() => toggleDosen(dosen.id)}
                    />
                    <span>
                      <strong>{dosen.name}</strong>
                      <small>
                        {dosen.identifier} • {getRoleLabels(dosen)}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="page-actions">
              <button
                type="button"
                className="primary-button"
                disabled={assignMutation.isPending}
                onClick={handleSubmitAssign}
              >
                {assignMutation.isPending ? "Menyimpan..." : "Simpan Penguji"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={closeDrawer}
              >
                Batal
              </button>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}