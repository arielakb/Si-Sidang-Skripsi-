import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  assignPembimbing,
  getDosenPembimbingOptions,
  getKompreSkripsiList
} from "../../services/seminarProposal";

type DosenOption = {
  id: string;
  identifier?: string | null;
  name: string;
  email?: string | null;
};

type KompreSkripsiItem = {
  id: string;
  title?: string | null;
  status?: string | null;
  tahap?: string | null;
  mahasiswa?: {
    name?: string | null;
    identifier?: string | null;
  } | null;
  peminatan?: {
    name?: string | null;
  } | null;
  dosenSkripsi?: Array<{
    id: string;
    peran: string;
    isActive?: boolean;
    dosen: DosenOption;
  }>;
};

type DrawerMode = "assign" | null;

export default function AssignPembimbingPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedSkripsi, setSelectedSkripsi] =
    useState<KompreSkripsiItem | null>(null);
  const [selectedDosenId, setSelectedDosenId] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const skripsiQuery = useQuery({
    queryKey: ["kompre-skripsi-list"],
    queryFn: getKompreSkripsiList
  });

  const dosenQuery = useQuery({
    queryKey: ["dosen-pembimbing-options"],
    queryFn: getDosenPembimbingOptions
  });

  const skripsiRows = (skripsiQuery.data ?? []) as KompreSkripsiItem[];
  const dosenOptions = (dosenQuery.data ?? []) as DosenOption[];

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return skripsiRows.filter((item) =>
      `${item.title ?? ""} ${item.mahasiswa?.name ?? ""} ${
        item.mahasiswa?.identifier ?? ""
      } ${item.peminatan?.name ?? ""} ${item.status ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [skripsiRows, search]);

  const assignMutation = useMutation({
    mutationFn: ({
      skripsiId,
      dosenId
    }: {
      skripsiId: string;
      dosenId: string;
    }) =>
      assignPembimbing(skripsiId, {
        dosenId
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["kompre-skripsi-list"]
      });

      closeDrawer();
      setPageError("");
      setSuccessMessage("Dosen pembimbing berhasil ditetapkan.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(error, "Gagal menetapkan dosen pembimbing.")
      );
    }
  });

  function getCurrentPembimbing(item: KompreSkripsiItem) {
    return item.dosenSkripsi?.find(
      (row) => row.peran === "PEMBIMBING" && row.isActive !== false
    );
  }

  function openAssignDrawer(item: KompreSkripsiItem) {
    const currentPembimbing = getCurrentPembimbing(item);

    setSelectedSkripsi(item);
    setSelectedDosenId(currentPembimbing?.dosen.id || "");
    setPageError("");
    setSuccessMessage("");
    setDrawerMode("assign");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedSkripsi(null);
    setSelectedDosenId("");
    setPageError("");
  }

  function handleAssign() {
    if (!selectedSkripsi) {
      setPageError("Pilih skripsi terlebih dahulu.");
      return;
    }

    if (!selectedDosenId) {
      setPageError("Pilih dosen pembimbing terlebih dahulu.");
      return;
    }

    assignMutation.mutate({
      skripsiId: selectedSkripsi.id,
      dosenId: selectedDosenId
    });
  }

  const selectedCurrentPembimbing = selectedSkripsi
    ? getCurrentPembimbing(selectedSkripsi)
    : undefined;

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Administrasi"
        title="Assign Dosen Pembimbing"
        description="Tetapkan dosen pembimbing untuk mahasiswa yang sudah lulus seminar proposal dan masuk tahap KOMPRE."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !drawerMode ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card assign-table-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Daftar Skripsi Tahap KOMPRE</h2>
            <p className="muted">
              List skripsi yang siap ditetapkan dosen pembimbingnya.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, mahasiswa, NPM..."
            />
          </div>
        </div>

        {skripsiQuery.isLoading || dosenQuery.isLoading ? (
          <EmptyState
            title="Memuat data..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRows}
            emptyMessage="Belum ada skripsi pada tahap KOMPRE"
            columns={[
              {
                key: "no",
                header: "No",
                align: "center",
                render: (_item, index) => index + 1
              },
              {
                key: "title",
                header: "Judul",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.title || "Tanpa judul"}</strong>
                    <span>{item.peminatan?.name || "-"}</span>
                  </div>
                )
              },
              {
                key: "mahasiswa",
                header: "Mahasiswa",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.mahasiswa?.name || "-"}</strong>
                    <span>{item.mahasiswa?.identifier || "-"}</span>
                  </div>
                )
              },
              {
                key: "pembimbing",
                header: "Pembimbing Saat Ini",
                render: (item) => {
                  const currentPembimbing = getCurrentPembimbing(item);

                  return currentPembimbing ? (
                    <div className="table-title-cell">
                      <strong>{currentPembimbing.dosen.name}</strong>
                      <span>
                        {currentPembimbing.dosen.identifier ||
                          currentPembimbing.dosen.email ||
                          "-"}
                      </span>
                    </div>
                  ) : (
                    <span className="muted">Belum ada pembimbing</span>
                  );
                }
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => <StatusBadge value={item.status} size="sm" />
              },
              {
                key: "actions",
                header: "Aksi",
                align: "right",
                render: (item) => (
                  <div className="table-actions">
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => openAssignDrawer(item)}
                    >
                      Atur Pembimbing
                    </button>
                  </div>
                )
              }
            ]}
          />
        )}
      </section>

      {drawerMode === "assign" && selectedSkripsi ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside
            className="crud-drawer assign-drawer"
            aria-label="Assign dosen pembimbing"
          >
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Assign Pembimbing</p>
                <h2>Atur Dosen Pembimbing</h2>
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

            <div className="assign-detail-stack">
              <div className="skripsi-detail-title">
                <strong>{selectedSkripsi.title || "Tanpa judul"}</strong>
                <StatusBadge value={selectedSkripsi.status} />
              </div>

              <div className="info-list">
                <div className="info-row">
                  <span>Mahasiswa</span>
                  <strong>{selectedSkripsi.mahasiswa?.name || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>NPM</span>
                  <strong>{selectedSkripsi.mahasiswa?.identifier || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Peminatan</span>
                  <strong>{selectedSkripsi.peminatan?.name || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Pembimbing Saat Ini</span>
                  <p>
                    {selectedCurrentPembimbing
                      ? `${selectedCurrentPembimbing.dosen.name} — ${
                          selectedCurrentPembimbing.dosen.identifier ||
                          selectedCurrentPembimbing.dosen.email ||
                          "-"
                        }`
                      : "Belum ada pembimbing"}
                  </p>
                </div>
              </div>

              <div className="drawer-section">
                <h3>Pilih Dosen Pembimbing</h3>

                <label>
                  <span>Dosen Pembimbing</span>
                  <select
                    value={selectedDosenId}
                    onChange={(event) => setSelectedDosenId(event.target.value)}
                  >
                    <option value="">Pilih dosen</option>
                    {dosenOptions.map((dosen) => (
                      <option key={dosen.id} value={dosen.id}>
                        {dosen.name} — {dosen.identifier || dosen.email || "-"}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className="primary-button"
                  disabled={!selectedDosenId || assignMutation.isPending}
                  onClick={handleAssign}
                >
                  {assignMutation.isPending
                    ? "Menyimpan..."
                    : "Simpan Pembimbing"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}