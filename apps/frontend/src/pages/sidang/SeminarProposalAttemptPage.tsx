import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import FileDownloadButton from "../../components/FileDownloadButton";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  getSidangList,
  registerSeminarProposalAttempt,
  uploadBerkasSidang,
  type SidangItem
} from "../../services/sidang";
import { getApiErrorMessage } from "../../utils/apiError";

const repeatableHasil = ["TIDAK_LOLOS", "REVISI", "ULANG"];

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getLatestAttemptBySkripsi(rows: SidangItem[]) {
  const map = new Map<string, SidangItem>();

  rows.forEach((item) => {
    const current = map.get(item.skripsiId);

    if (!current || item.attemptNo > current.attemptNo) {
      map.set(item.skripsiId, item);
    }
  });

  return map;
}

function getLatestBerkas(item: SidangItem, kategori: "PROPOSAL" | "PRESENTASI") {
  return (item.berkas ?? []).find((berkas) => berkas.kategori === kategori);
}

function canRegisterRepeat(item: SidangItem, latestMap: Map<string, SidangItem>) {
  const latest = latestMap.get(item.skripsiId);

  if (!latest || latest.id !== item.id) return false;

  return repeatableHasil.includes(String(item.hasil || ""));
}

export default function SeminarProposalAttemptPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canReadSidang = hasPermission("sidang.read");
  const canCreateSkripsi = hasPermission("skripsi.create");
  const canUploadBerkas = hasPermission("berkas.upload");
  const canDownloadBerkas = hasPermission("berkas.download");

  const [search, setSearch] = useState("");
  const [uploadingKey, setUploadingKey] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sidangQuery = useQuery({
    queryKey: ["sidang", "seminar-proposal", "attempt-mahasiswa"],
    queryFn: () =>
      getSidangList({
        jenis: "SEMINAR_PROPOSAL",
        limit: 100
      }),
    enabled: canReadSidang
  });

  const sidangRows = sidangQuery.data?.data ?? [];

  const latestMap = useMemo(
    () => getLatestAttemptBySkripsi(sidangRows),
    [sidangRows]
  );

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return sidangRows.filter((item) =>
      `${item.skripsi?.title ?? ""} ${item.skripsi?.mahasiswa?.name ?? ""} ${
        item.skripsi?.mahasiswa?.identifier ?? ""
      } ${item.status ?? ""} ${item.hasil ?? ""} ${item.catatanHasil ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [sidangRows, search]);

  const registerMutation = useMutation({
    mutationFn: (skripsiId: string) => registerSeminarProposalAttempt(skripsiId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-proposal", "attempt-mahasiswa"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-proposal"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["my-skripsi"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-summary"]
        })
      ]);

      setPageError("");
      setSuccessMessage("Attempt seminar proposal baru berhasil dibuat.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal daftar ulang seminar proposal. Pastikan attempt sebelumnya sudah selesai dan belum melewati batas maksimal."
        )
      );
    }
  });

  const uploadMutation = useMutation({
    mutationFn: ({
      sidangId,
      kategori,
      file
    }: {
      sidangId: string;
      kategori: "PROPOSAL" | "PRESENTASI";
      file: File;
    }) => uploadBerkasSidang(sidangId, kategori, file),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-proposal", "attempt-mahasiswa"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-proposal", "jadwal"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["my-skripsi"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["dashboard-summary"]
        })
      ]);

      setUploadingKey("");
      setPageError("");
      setSuccessMessage("Berkas seminar proposal berhasil diupload.");
    },
    onError: (error) => {
      setUploadingKey("");
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Upload berkas gagal. Pastikan sidang masih aktif dan file berupa PDF."
        )
      );
    }
  });

  function handleRegisterRepeat(item: SidangItem) {
    const confirmed = window.confirm(
      `Daftar ulang seminar proposal untuk "${item.skripsi?.title || "Tanpa judul"}"?`
    );

    if (!confirmed) return;

    setPageError("");
    setSuccessMessage("");
    registerMutation.mutate(item.skripsiId);
  }

  function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
    item: SidangItem,
    kategori: "PROPOSAL" | "PRESENTASI"
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    setUploadingKey(`${item.id}-${kategori}`);
    setPageError("");
    setSuccessMessage("");

    uploadMutation.mutate({
      sidangId: item.id,
      kategori,
      file
    });
  }

  if (!canReadSidang) {
    return (
      <section className="page-stack">
        <div className="alert-error">
          Anda tidak memiliki akses ke riwayat seminar proposal.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Seminar Proposal"
        title="Attempt Seminar Proposal"
        description="Lihat riwayat attempt seminar proposal, upload berkas per attempt, dan daftar ulang jika belum lolos."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError ? <div className="alert-error">{pageError}</div> : null}

      <section className="list-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Riwayat Attempt</h2>
            <p className="muted">
              Attempt yang tidak lolos, revisi, atau ulang dapat didaftarkan ulang sesuai aturan workflow.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, status, hasil, catatan..."
            />
          </div>
        </div>

        {sidangQuery.isLoading ? (
          <EmptyState
            title="Memuat attempt seminar proposal..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRows}
            emptyMessage="Belum ada attempt seminar proposal"
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
                render: (item) => {
                  const proposal = getLatestBerkas(item, "PROPOSAL");
                  const presentasi = getLatestBerkas(item, "PRESENTASI");

                  return (
                    <div className="table-title-cell">
                      <strong>
                        {proposal ? "Proposal ada" : "Proposal belum ada"}
                      </strong>
                      <span>
                        {presentasi
                          ? "Presentasi ada"
                          : "Presentasi belum ada"}
                      </span>
                    </div>
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
                key: "catatan",
                header: "Catatan",
                render: (item) => item.catatanHasil || "-"
              },
              {
                key: "createdAt",
                header: "Dibuat",
                render: (item) => formatDateTime(item.createdAt)
              },
              {
                key: "actions",
                header: "Aksi",
                align: "right",
                render: (item) => {
                  const proposal = getLatestBerkas(item, "PROPOSAL");
                  const presentasi = getLatestBerkas(item, "PRESENTASI");
                  const isActive = !["SELESAI", "DIBATALKAN"].includes(
                    item.status
                  );

                  return (
                    <div className="table-actions">
                      {proposal && canDownloadBerkas ? (
                        <FileDownloadButton
                          berkasId={proposal.id}
                          fileName={proposal.originalName || "Proposal"}
                        />
                      ) : null}

                      {presentasi && canDownloadBerkas ? (
                        <FileDownloadButton
                          berkasId={presentasi.id}
                          fileName={presentasi.originalName || "Presentasi"}
                        />
                      ) : null}

                      {canUploadBerkas && isActive ? (
                        <>
                          <label className="secondary-button upload-inline-button">
                            {uploadingKey === `${item.id}-PROPOSAL`
                              ? "Upload..."
                              : proposal
                                ? "Upload Ulang Proposal"
                                : "Upload Proposal"}
                            <input
                              type="file"
                              accept="application/pdf"
                              disabled={uploadMutation.isPending}
                              onChange={(event) =>
                                handleUpload(event, item, "PROPOSAL")
                              }
                            />
                          </label>

                          <label className="secondary-button upload-inline-button">
                            {uploadingKey === `${item.id}-PRESENTASI`
                              ? "Upload..."
                              : presentasi
                                ? "Upload Ulang Presentasi"
                                : "Upload Presentasi"}
                            <input
                              type="file"
                              accept="application/pdf"
                              disabled={uploadMutation.isPending}
                              onChange={(event) =>
                                handleUpload(event, item, "PRESENTASI")
                              }
                            />
                          </label>
                        </>
                      ) : null}

                      {canCreateSkripsi &&
                      canRegisterRepeat(item, latestMap) ? (
                        <button
                          type="button"
                          className="primary-button"
                          disabled={registerMutation.isPending}
                          onClick={() => handleRegisterRepeat(item)}
                        >
                          Daftar Ulang
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
    </section>
  );
}