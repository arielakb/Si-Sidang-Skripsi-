import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import DataTable from "../../components/ui/DataTable";
import DetailPanel from "../../components/ui/DetailPanel";
import FilterToolbar from "../../components/ui/FilterToolbar";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  assignPembimbing,
  getSkripsiList
} from "../../services/skripsi";
import {
  getDosenPembimbingOptions
} from "../../services/seminarProposal";
import { getApiErrorMessage } from "../../utils/apiError";

function getPembimbingRows(item: any) {
  return (item.dosenSkripsi ?? []).filter(
    (row: any) => row.peran === "PEMBIMBING" && row.isActive !== false
  );
}

function getPembimbingLabel(item: any) {
  const rows = getPembimbingRows(item);

  if (rows.length === 0) return "Belum ada pembimbing";

  return rows
    .map((row: any) => row.dosen?.name || row.dosenId)
    .join(", ");
}

function isAssignableStatus(status?: string | null) {
  return ![
    "SELESAI",
    "DITOLAK",
    "NONAKTIF",
    "DIBATALKAN",
    "DIARSIPKAN"
  ].includes(String(status || "").toUpperCase());
}

export default function AssignPembimbingPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canAssign = hasPermission("skripsi.assign_dosen");

  const [search, setSearch] = useState("");
  const [selectedDosenMap, setSelectedDosenMap] = useState<Record<string, string[]>>({});
  const [selectedSkripsiForAssign, setSelectedSkripsiForAssign] = useState<any | null>(null);
  const [dosenSearch, setDosenSearch] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const skripsiQuery = useQuery({
    queryKey: ["skripsi-list-assign"],
    queryFn: () =>
      getSkripsiList({
        limit: 100
      })
  });

  const dosenQuery = useQuery({
    queryKey: ["dosen-pembimbing-options"],
    queryFn: getDosenPembimbingOptions,
    enabled: canAssign
  });

  const skripsiRows = skripsiQuery.data?.data ?? [];
  const dosenOptions = dosenQuery.data ?? [];

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return skripsiRows
      .filter((item: any) => isAssignableStatus(item.status))
      .filter((item: any) =>
        `${item.title ?? ""} ${item.mahasiswa?.name ?? ""} ${item.mahasiswa?.identifier ?? ""
          } ${item.status ?? ""} ${getPembimbingLabel(item)}`
          .toLowerCase()
          .includes(keyword)
      );
  }, [skripsiRows, search]);

  const assignMutation = useMutation({
    mutationFn: ({
      skripsiId,
      dosenIds
    }: {
      skripsiId: string;
      dosenIds: string[];
    }) =>
      assignPembimbing(skripsiId, {
        dosenIds
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["skripsi-list-assign"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["skripsi"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["my-skripsi"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-summary"]
        })
      ]);

      setPageError("");
      setSuccessMessage("Dosen pembimbing berhasil ditetapkan.");
      setSelectedSkripsiForAssign(null);
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal menetapkan dosen pembimbing. Pastikan jumlah pembimbing memenuhi aturan workflow."
        )
      );
    }
  });

  function getSelectedDosenIds(item: any) {
    const selected = selectedDosenMap[item.id];

    if (selected) return selected;

    return getPembimbingRows(item).map((row: any) => row.dosenId);
  }

  function toggleDosen(skripsiId: string, dosenId: string) {
    setSelectedDosenMap((current) => {
      const currentIds = current[skripsiId] ?? [];
      const nextIds = currentIds.includes(dosenId)
        ? currentIds.filter((id) => id !== dosenId)
        : [...currentIds, dosenId];

      return {
        ...current,
        [skripsiId]: nextIds
      };
    });
  }

  function handleAssign() {
    if (!selectedSkripsiForAssign) return;

    const dosenIds = getSelectedDosenIds(selectedSkripsiForAssign);

    setPageError("");
    setSuccessMessage("");

    if (dosenIds.length === 0) {
      setPageError("Pilih minimal satu dosen pembimbing.");
      return;
    }

    assignMutation.mutate({
      skripsiId: selectedSkripsiForAssign.id,
      dosenIds
    });
  }

  if (!canAssign) {
    return (
      <section className="page-stack">
        <div className="alert-error">
          Anda tidak memiliki akses untuk assign dosen pembimbing.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Administrasi Skripsi"
        title="Assign Dosen Pembimbing"
        description="Tetapkan lebih dari satu dosen pembimbing untuk mahasiswa yang sudah lolos seminar proposal."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError ? <div className="alert-error">{pageError}</div> : null}

      <section className="list-card">
        <DataTable
          data={filteredRows}
          isLoading={skripsiQuery.isLoading || dosenQuery.isLoading}
          emptyMessage="Belum ada skripsi yang siap assign pembimbing"
          toolbar={
            <FilterToolbar
              title="Daftar Skripsi Siap Bimbingan"
              description="Setelah pembimbing ditetapkan, status skripsi berubah menjadi BIMBINGAN."
              searchValue={search}
              onSearchChange={setSearch}
              searchPlaceholder="Cari judul, mahasiswa, status, pembimbing..."
            />
          }
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
              render: (item: any) => (
                <div className="table-title-cell">
                  <strong>{item.title || "Tanpa judul"}</strong>
                  <span>
                    {item.mahasiswa?.name || "-"} •{" "}
                    {item.mahasiswa?.identifier || "-"}
                  </span>
                </div>
              )
            },
            {
              key: "peminatan",
              header: "Peminatan",
              render: (item: any) => item.peminatan?.name || "-"
            },
            {
              key: "status",
              header: "Status",
              align: "center",
              render: (item: any) => <StatusBadge value={item.status} size="sm" />
            },
            {
              key: "current",
              header: "Pembimbing Saat Ini",
              render: (item: any) => getPembimbingLabel(item)
            },
            {
              key: "actions",
              header: "Aksi",
              align: "right",
              render: (item: any) => (
                <div className="table-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      setSelectedSkripsiForAssign(item);
                      setDosenSearch("");
                    }}
                  >
                    Assign Dosen
                  </button>
                </div>
              )
            }
          ]}
        />

      </section>

      <DetailPanel
        open={Boolean(selectedSkripsiForAssign)}
        title="Pilih Dosen Pembimbing"
        subtitle={selectedSkripsiForAssign?.title || "Tanpa judul"}
        width="md"
        onClose={() => setSelectedSkripsiForAssign(null)}
      >
        {selectedSkripsiForAssign ? (
          <div className="page-stack">
            <div className="workflow-history-head">
              <div>
                <p className="eyebrow">
                  {selectedSkripsiForAssign.mahasiswa?.identifier || "-"}
                </p>
                <h2>{selectedSkripsiForAssign.mahasiswa?.name || "-"}</h2>
                <p className="muted">
                  Peminatan: {selectedSkripsiForAssign.peminatan?.name || "-"}
                </p>
              </div>
            </div>

            <div className="form-field">
              <input
                type="text"
                placeholder="Cari nama dosen..."
                value={dosenSearch}
                onChange={(e) => setDosenSearch(e.target.value)}
              />
            </div>

            <div className="role-check-grid compact-check-grid" style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {dosenOptions
                .filter((dosen: any) =>
                  `${dosen.name} ${dosen.identifier}`
                    .toLowerCase()
                    .includes(dosenSearch.toLowerCase())
                )
                .map((dosen: any) => (
                  <label key={dosen.id} className="role-check-item">
                    <input
                      type="checkbox"
                      checked={getSelectedDosenIds(selectedSkripsiForAssign).includes(dosen.id)}
                      onChange={() => toggleDosen(selectedSkripsiForAssign.id, dosen.id)}
                    />
                    <span>
                      <strong>{dosen.name}</strong>
                      <small>{dosen.identifier || dosen.email || "-"}</small>
                    </span>
                  </label>
                ))}
            </div>

            <div className="form-actions" style={{ marginTop: "1rem" }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedSkripsiForAssign(null)}
              >
                Batal
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={assignMutation.isPending}
                onClick={handleAssign}
              >
                {assignMutation.isPending ? "Menyimpan..." : "Simpan Pembimbing"}
              </button>
            </div>
          </div>
        ) : null}
      </DetailPanel>
    </section>
  );
}