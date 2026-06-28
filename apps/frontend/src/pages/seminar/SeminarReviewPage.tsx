import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FileDownloadButton from "../../components/FileDownloadButton";
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

export default function SeminarReviewPage() {
  const queryClient = useQueryClient();

  const [status, setStatus] = useState("MENUNGGU_APPROVAL");
  const [search, setSearch] = useState("");
  const [catatanMap, setCatatanMap] = useState<Record<string, string>>({});

  const seminarQuery = useQuery({
    queryKey: ["seminar-review-list", status, search],
    queryFn: () =>
      getSeminarProposalList({
        status: status || undefined,
        search: search || undefined
      })
  });

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
    await queryClient.invalidateQueries({
      queryKey: ["seminar-review-list"]
    });

    await queryClient.invalidateQueries({
      queryKey: ["my-seminar-proposals"]
    });

    alert("Review seminar proposal berhasil disimpan.");
  },
  onError: (error) => {
    alert(getApiErrorMessage(error, "Review seminar proposal gagal."));
  }
});

  function handleReview(
    skripsiId: string,
    decision: ReviewSeminarDecision
  ) {
    reviewMutation.mutate({
      skripsiId,
      decision,
      catatan: catatanMap[skripsiId] || undefined
    });
  }

  const rows = (seminarQuery.data ?? []) as SeminarItem[];

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Akademik</p>
        <h1>Review Seminar Proposal</h1>
        <p className="muted">
          Review proposal yang sudah lengkap berkas dan menunggu approval.
        </p>
      </div>

      <section className="card form-grid">
        <label>
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Semua status</option>
            <option value="MENUNGGU_APPROVAL">Menunggu Approval</option>
            <option value="MENUNGGU_BERKAS">Menunggu Berkas</option>
            <option value="MENUNGGU_REVISI">Menunggu Revisi</option>
            <option value="DITOLAK">Ditolak</option>
          </select>
        </label>

        <label>
          <span>Cari</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nama/NPM/judul"
          />
        </label>
      </section>

      <section className="list-card">
        <h2>Daftar Seminar Proposal</h2>

        {seminarQuery.isLoading ? (
          <p>Memuat data seminar proposal...</p>
        ) : rows.length === 0 ? (
          <p className="muted">Belum ada data sesuai filter.</p>
        ) : (
          rows.map((item) => {
            const proposal = getLatestBerkas(item.berkas ?? [], "PROPOSAL");
            const presentasi = getLatestBerkas(item.berkas ?? [], "PRESENTASI");
            const kodeEtikAgreed = (item.kodeEtik ?? []).length > 0;
            const canReview = item.status === "MENUNGGU_APPROVAL";

            return (
              <article key={item.id} className="academic-card">
                <div className="page-header-row">
                  <div>
                    <strong>{item.title || "Tanpa judul"}</strong>
                    <p className="muted">
                      {item.mahasiswa?.name || "-"} •{" "}
                      {item.mahasiswa?.identifier || "-"} •{" "}
                      {item.peminatan?.name || "-"}
                    </p>
                  </div>

                  <StatusBadge value={item.status} />
                </div>

                <p>{item.abstract || "Belum ada abstrak."}</p>

                <div className="workflow-grid">
                  <div className="workflow-step">
                    <strong>Proposal</strong>
                    <StatusBadge value={proposal?.status || "BELUM_UPLOAD"} size="sm" />

                    {proposal ? (
                      <div className="row-inline">
                        <FileDownloadButton
                          berkasId={proposal.id}
                          fileName={getBerkasName(proposal)}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="workflow-step">
                    <strong>Presentasi</strong>
                    <StatusBadge value={presentasi?.status || "BELUM_UPLOAD"} size="sm" />

                    {presentasi ? (
                      <div className="row-inline">
                        <FileDownloadButton
                          berkasId={presentasi.id}
                          fileName={getBerkasName(presentasi)}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="workflow-step">
                    <strong>Kode Etik</strong>
                    <StatusBadge
                      value={kodeEtikAgreed ? "DISETUJUI" : "BELUM_SETUJU"}
                      size="sm"
                    />
                  </div>
                </div>

                <label className="mini-section">
                  <h3>Catatan Review</h3>
                  <textarea
                    value={catatanMap[item.id] || ""}
                    onChange={(event) =>
                      setCatatanMap((current) => ({
                        ...current,
                        [item.id]: event.target.value
                      }))
                    }
                    placeholder="Catatan untuk mahasiswa"
                    disabled={!canReview}
                  />
                </label>

                <div className="row-inline">
                  <button
                    type="button"
                    className="primary-button"
                    disabled={!canReview || reviewMutation.isPending}
                    onClick={() => handleReview(item.id, "APPROVE")}
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={!canReview || reviewMutation.isPending}
                    onClick={() => handleReview(item.id, "REVISI")}
                  >
                    Minta Revisi
                  </button>

                  <button
                    type="button"
                    className="secondary-button danger-button"
                    disabled={!canReview || reviewMutation.isPending}
                    onClick={() => handleReview(item.id, "TOLAK")}
                  >
                    Tolak
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </section>
  );
}