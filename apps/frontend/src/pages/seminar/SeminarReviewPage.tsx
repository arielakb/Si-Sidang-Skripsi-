import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FileDownloadButton from "../../components/FileDownloadButton";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  getSeminarProposalList,
  reviewSeminarProposal,
  type ReviewSeminarDecision
} from "../../services/seminarProposal";
import { getApiErrorMessage } from "../../utils/apiError";

type BerkasItem = {
  id: string;
  kategori: string;
  status?: string | null;
  originalName?: string | null;
  fileName?: string | null;
  createdAt?: string | null;
};

type SeminarItem = {
  id: string;
  title?: string | null;
  abstract?: string | null;
  status?: string | null;
  tahap?: string | null;
  createdAt?: string | null;
  mahasiswa?: {
    identifier?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  peminatan?: {
    name?: string | null;
  } | null;
  berkas?: BerkasItem[];
  kodeEtik?: unknown[];
};

type DrawerMode = "detail" | null;

const statusOptions = [
  {
    value: "",
    label: "Semua Status"
  },
  {
    value: "MENUNGGU_APPROVAL",
    label: "Menunggu Approval"
  },
  {
    value: "MENUNGGU_BERKAS",
    label: "Menunggu Berkas"
  },
  {
    value: "MENUNGGU_REVISI",
    label: "Menunggu Revisi"
  },
  {
    value: "DITOLAK",
    label: "Ditolak"
  }
];

function getLatestBerkas(berkas: BerkasItem[] = [], kategori: string) {
  return [...berkas]
    .filter((item) => item.kategori === kategori)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bTime - aTime;
    })[0];
}

function getBerkasName(berkas?: BerkasItem) {
  return berkas?.originalName || berkas?.fileName || "Berkas";
}

function getCompleteness(item: SeminarItem) {
  const proposal = getLatestBerkas(item.berkas ?? [], "PROPOSAL");
  const presentasi = getLatestBerkas(item.berkas ?? [], "PRESENTASI");
  const kodeEtik = (item.kodeEtik ?? []).length > 0;

  return [proposal, presentasi, kodeEtik].filter(Boolean).length;
}

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function SeminarReviewPage() {
  const queryClient = useQueryClient();

  const [status, setStatus] = useState("MENUNGGU_APPROVAL");
  const [search, setSearch] = useState("");
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedSeminar, setSelectedSeminar] = useState<SeminarItem | null>(
    null
  );
  const [catatan, setCatatan] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const seminarQuery = useQuery({
    queryKey: ["seminar-review-list", status, search],
    queryFn: () =>
      getSeminarProposalList({
        status: status || undefined,
        search: search || undefined
      })
  });

  const rows = (seminarQuery.data ?? []) as SeminarItem[];

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return rows.filter((item) =>
      `${item.title ?? ""} ${item.mahasiswa?.name ?? ""} ${
        item.mahasiswa?.identifier ?? ""
      } ${item.peminatan?.name ?? ""} ${item.status ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [rows, search]);

  const reviewMutation = useMutation({
    mutationFn: ({
      skripsiId,
      decision,
      catatan
    }: {
      skripsiId: string;
      decision: ReviewSeminarDecision;
      catatan?: string;
    }) =>
      reviewSeminarProposal(skripsiId, {
        decision,
        catatan
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["seminar-review-list"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["my-seminar-proposals"]
        })
      ]);

      closeDrawer();
      setPageError("");
      setSuccessMessage("Review seminar proposal berhasil disimpan.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(error, "Review seminar proposal gagal.")
      );
    }
  });

  function openDetailDrawer(item: SeminarItem) {
    setSelectedSeminar(item);
    setCatatan("");
    setPageError("");
    setSuccessMessage("");
    setDrawerMode("detail");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedSeminar(null);
    setCatatan("");
    setPageError("");
  }

  function handleReview(decision: ReviewSeminarDecision) {
    if (!selectedSeminar) return;

    reviewMutation.mutate({
      skripsiId: selectedSeminar.id,
      decision,
      catatan: catatan.trim() || undefined
    });
  }

  const selectedProposal = selectedSeminar
    ? getLatestBerkas(selectedSeminar.berkas ?? [], "PROPOSAL")
    : undefined;

  const selectedPresentasi = selectedSeminar
    ? getLatestBerkas(selectedSeminar.berkas ?? [], "PRESENTASI")
    : undefined;

  const selectedKodeEtikAgreed = selectedSeminar
    ? (selectedSeminar.kodeEtik ?? []).length > 0
    : false;

  const canReview = selectedSeminar?.status === "MENUNGGU_APPROVAL";

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Akademik"
        title="Review Seminar Proposal"
        description="Review proposal yang sudah lengkap berkas dan menunggu approval."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !drawerMode ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card seminar-table-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Daftar Seminar Proposal</h2>
            <p className="muted">
              List seminar proposal berdasarkan status, mahasiswa, dan peminatan.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, NPM, judul..."
            />

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              {statusOptions.map((item) => (
                <option key={item.label} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {seminarQuery.isLoading ? (
          <EmptyState
            title="Memuat data seminar proposal..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRows}
            emptyMessage="Belum ada data sesuai filter"
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
                    <span>{formatDate(item.createdAt)}</span>
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
                key: "peminatan",
                header: "Peminatan",
                render: (item) => item.peminatan?.name || "-"
              },
              {
                key: "berkas",
                header: "Berkas",
                align: "center",
                render: (item) => (
                  <div className="table-berkas-cell">
                    <strong>{getCompleteness(item)}/3</strong>
                    <StatusBadge
                      value={getCompleteness(item) === 3 ? "LENGKAP" : "BELUM_LENGKAP"}
                      size="sm"
                    />
                  </div>
                )
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
                      className="secondary-button"
                      onClick={() => openDetailDrawer(item)}
                    >
                      Detail
                    </button>
                  </div>
                )
              }
            ]}
          />
        )}
      </section>

      {drawerMode === "detail" && selectedSeminar ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside
            className="crud-drawer seminar-drawer"
            aria-label="Detail review seminar"
          >
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Review Seminar</p>
                <h2>Detail Seminar Proposal</h2>
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

            <div className="seminar-detail-stack">
              <div className="skripsi-detail-title">
                <strong>{selectedSeminar.title || "Tanpa judul"}</strong>
                <StatusBadge value={selectedSeminar.status} />
              </div>

              <div className="info-list">
                <div className="info-row">
                  <span>Mahasiswa</span>
                  <strong>{selectedSeminar.mahasiswa?.name || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>NPM</span>
                  <strong>{selectedSeminar.mahasiswa?.identifier || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Email</span>
                  <strong>{selectedSeminar.mahasiswa?.email || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Peminatan</span>
                  <strong>{selectedSeminar.peminatan?.name || "-"}</strong>
                </div>

                <div className="info-row">
                  <span>Abstrak</span>
                  <p>{selectedSeminar.abstract || "Belum ada abstrak."}</p>
                </div>
              </div>

              <div className="drawer-section">
                <h3>Kelengkapan Berkas</h3>

                <div className="file-list">
                  <div className="file-row">
                    <div className="file-row-main">
                      <strong>Proposal</strong>
                      <span>{getBerkasName(selectedProposal)}</span>
                    </div>

                    <StatusBadge
                      value={selectedProposal?.status || "BELUM_UPLOAD"}
                      size="sm"
                    />

                    <div className="file-row-actions">
                      {selectedProposal ? (
                        <FileDownloadButton
                          berkasId={selectedProposal.id}
                          fileName={getBerkasName(selectedProposal)}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="file-row">
                    <div className="file-row-main">
                      <strong>Presentasi</strong>
                      <span>{getBerkasName(selectedPresentasi)}</span>
                    </div>

                    <StatusBadge
                      value={selectedPresentasi?.status || "BELUM_UPLOAD"}
                      size="sm"
                    />

                    <div className="file-row-actions">
                      {selectedPresentasi ? (
                        <FileDownloadButton
                          berkasId={selectedPresentasi.id}
                          fileName={getBerkasName(selectedPresentasi)}
                        />
                      ) : null}
                    </div>
                  </div>

                  <div className="file-row">
                    <div className="file-row-main">
                      <strong>Kode Etik</strong>
                      <span>
                        {selectedKodeEtikAgreed
                          ? "Mahasiswa sudah menyetujui kode etik."
                          : "Kode etik belum disetujui."}
                      </span>
                    </div>

                    <StatusBadge
                      value={selectedKodeEtikAgreed ? "DISETUJUI" : "BELUM_SETUJU"}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              <div className="drawer-section">
                <h3>Catatan Review</h3>

                <label>
                  <span>Catatan untuk mahasiswa</span>
                  <textarea
                    value={catatan}
                    onChange={(event) => setCatatan(event.target.value)}
                    placeholder="Catatan untuk mahasiswa"
                    disabled={!canReview}
                  />
                </label>

                <div className="page-actions">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!canReview || reviewMutation.isPending}
                    onClick={() => handleReview("APPROVE")}
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!canReview || reviewMutation.isPending}
                    onClick={() => handleReview("REVISI")}
                  >
                    Minta Revisi
                  </button>

                  <button
                    type="button"
                    className="danger-button"
                    disabled={!canReview || reviewMutation.isPending}
                    onClick={() => handleReview("TOLAK")}
                  >
                    Tolak
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}