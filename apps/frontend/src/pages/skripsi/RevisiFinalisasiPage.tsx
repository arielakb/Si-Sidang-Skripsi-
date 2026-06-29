import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import FileDownloadButton from "../../components/FileDownloadButton";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import MetricCard from "../../components/ui/MetricCard";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import {
  approveFinalSkripsi,
  rejectFinalSkripsi,
  uploadFinalSkripsi,
  uploadLembarPengesahan
} from "../../services/finalisasi";
import {
  createRevisiSidang,
  getRevisiSidangBySkripsi,
  reviewRevisiSidang,
  uploadRevisiSidang
} from "../../services/revisiSidang";
import { getSkripsiList } from "../../services/skripsi";
import type { RevisiSidangItem } from "../../types/finalisasi";
import type { SkripsiSummary } from "../../types/skripsi";
import { getApiErrorMessage } from "../../utils/apiError";

type DrawerMode = "create-revisi" | "detail-revisi" | "finalisasi" | null;

const emptyRevisiForm = {
  catatan: "",
  deadline: ""
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getBerkasName(revisi?: RevisiSidangItem | null) {
  return revisi?.berkas?.originalName || "Belum ada berkas";
}

function getDeadlineStatus(deadline?: string | null) {
  if (!deadline) return "TANPA_DEADLINE";

  const deadlineTime = new Date(deadline).getTime();
  const now = Date.now();

  if (deadlineTime < now) return "LEWAT_DEADLINE";

  return "ADA_DEADLINE";
}

export default function RevisiFinalisasiPage() {
  const { hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const isMahasiswa = hasRole("mahasiswa");
  const canCreateRevisi = hasPermission("revisi.create");
  const canReviewRevisi = hasPermission("revisi.approve");
  const canApproveFinal = hasPermission("skripsi.approve_final");
  const canUploadRevisi = hasPermission("revisi.upload");
  const canUploadBerkas = hasPermission(["berkas.upload", "revisi.upload"]);

  const [selectedSkripsiId, setSelectedSkripsiId] = useState("");
  const [selectedRevisi, setSelectedRevisi] = useState<RevisiSidangItem | null>(
    null
  );
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [revisiForm, setRevisiForm] = useState(emptyRevisiForm);
  const [reviewCatatan, setReviewCatatan] = useState("");
  const [finalCatatan, setFinalCatatan] = useState("");
  const [finalAlasan, setFinalAlasan] = useState("");
  const [uploadingKey, setUploadingKey] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const skripsiQuery = useQuery({
    queryKey: ["skripsi-list-for-revisi-final"],
    queryFn: () =>
      getSkripsiList({
        limit: 100
      })
  });

  const skripsiOptions: SkripsiSummary[] = useMemo(() => {
    const rows = skripsiQuery.data?.data ?? [];

    return rows.filter((item) =>
      [
        "MENUNGGU_REVISI",
        "MENUNGGU_FINAL",
        "MENUNGGU_PENGESAHAN",
        "SELESAI"
      ].includes(item.status)
    );
  }, [skripsiQuery.data]);

  useEffect(() => {
    if (!selectedSkripsiId && skripsiOptions.length > 0) {
      setSelectedSkripsiId(skripsiOptions[0].id);
    }
  }, [selectedSkripsiId, skripsiOptions]);

  const selectedSkripsi = skripsiOptions.find(
    (item) => item.id === selectedSkripsiId
  );

  const revisiQuery = useQuery({
    queryKey: ["revisi-sidang", selectedSkripsiId],
    queryFn: () => getRevisiSidangBySkripsi(selectedSkripsiId),
    enabled: Boolean(selectedSkripsiId)
  });

  const revisiRows = revisiQuery.data ?? [];

  const filteredRevisiRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return revisiRows.filter((item) => {
      const matchesSearch = `${item.catatan} ${item.status} ${
        item.dibuatOleh?.name ?? ""
      } ${item.berkas?.originalName ?? ""}`
        .toLowerCase()
        .includes(keyword);

      const matchesStatus = statusFilter ? item.status === statusFilter : true;

      return matchesSearch && matchesStatus;
    });
  }, [revisiRows, search, statusFilter]);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(revisiRows.map((item) => item.status))).filter(
      Boolean
    );
  }, [revisiRows]);

  const createRevisiMutation = useMutation({
    mutationFn: () =>
      createRevisiSidang(selectedSkripsiId, {
        catatan: revisiForm.catatan.trim(),
        deadline: revisiForm.deadline
          ? new Date(revisiForm.deadline).toISOString()
          : null
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["revisi-sidang"] }),
        queryClient.invalidateQueries({
          queryKey: ["skripsi-list-for-revisi-final"]
        })
      ]);

      setRevisiForm(emptyRevisiForm);
      closeDrawer();
      setPageError("");
      setSuccessMessage("Catatan revisi berhasil dibuat.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal membuat revisi. Pastikan Anda dosen pembimbing/penguji yang ter-assign pada skripsi ini."
        )
      );
    }
  });

  const uploadRevisiMutation = useMutation({
    mutationFn: ({ revisiId, file }: { revisiId: string; file: File }) =>
      uploadRevisiSidang(revisiId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["revisi-sidang"] });

      setUploadingKey("");
      setPageError("");
      setSuccessMessage("Berkas revisi berhasil diupload.");
    },
    onError: (error) => {
      setUploadingKey("");
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Upload revisi gagal. Pastikan file PDF dan Anda adalah pemilik skripsi."
        )
      );
    }
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      revisiId,
      decision
    }: {
      revisiId: string;
      decision: "APPROVE" | "TOLAK";
    }) =>
      reviewRevisiSidang(revisiId, {
        decision,
        catatan: reviewCatatan.trim() || undefined
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["revisi-sidang"] }),
        queryClient.invalidateQueries({
          queryKey: ["skripsi-list-for-revisi-final"]
        })
      ]);

      closeDrawer();
      setPageError("");
      setSuccessMessage("Review revisi berhasil disimpan.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal review revisi."));
    }
  });

  const uploadFinalMutation = useMutation({
    mutationFn: ({ skripsiId, file }: { skripsiId: string; file: File }) =>
      uploadFinalSkripsi(skripsiId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["skripsi-list-for-revisi-final"]
      });

      setUploadingKey("");
      setPageError("");
      setSuccessMessage("Berkas final skripsi berhasil diupload.");
    },
    onError: (error) => {
      setUploadingKey("");
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Upload final gagal. Pastikan status skripsi sudah MENUNGGU_FINAL."
        )
      );
    }
  });

  const uploadPengesahanMutation = useMutation({
    mutationFn: ({ skripsiId, file }: { skripsiId: string; file: File }) =>
      uploadLembarPengesahan(skripsiId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["skripsi-list-for-revisi-final"]
      });

      setUploadingKey("");
      setPageError("");
      setSuccessMessage("Lembar pengesahan berhasil diupload.");
    },
    onError: (error) => {
      setUploadingKey("");
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Upload lembar pengesahan gagal. Pastikan role memiliki izin upload berkas."
        )
      );
    }
  });

  const finalDecisionMutation = useMutation({
    mutationFn: ({
      decision,
      text
    }: {
      decision: "APPROVE" | "TOLAK";
      text: string;
    }) => {
      if (decision === "APPROVE") {
        return approveFinalSkripsi(selectedSkripsiId, text);
      }

      return rejectFinalSkripsi(selectedSkripsiId, text);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["skripsi-list-for-revisi-final"]
      });

      closeDrawer();
      setPageError("");
      setSuccessMessage("Keputusan finalisasi berhasil disimpan.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Approval final gagal. Pastikan berkas final sudah diupload dan status skripsi MENUNGGU_PENGESAHAN."
        )
      );
    }
  });

  function openCreateRevisiDrawer() {
    setDrawerMode("create-revisi");
    setSelectedRevisi(null);
    setRevisiForm(emptyRevisiForm);
    setReviewCatatan("");
    setPageError("");
    setSuccessMessage("");
  }

  function openDetailRevisiDrawer(revisi: RevisiSidangItem) {
    setDrawerMode("detail-revisi");
    setSelectedRevisi(revisi);
    setReviewCatatan("");
    setPageError("");
    setSuccessMessage("");
  }

  function openFinalisasiDrawer() {
    setDrawerMode("finalisasi");
    setSelectedRevisi(null);
    setReviewCatatan("");
    setFinalCatatan("");
    setFinalAlasan("");
    setPageError("");
    setSuccessMessage("");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedRevisi(null);
    setRevisiForm(emptyRevisiForm);
    setReviewCatatan("");
    setFinalCatatan("");
    setFinalAlasan("");
    setUploadingKey("");
    setPageError("");
  }

  function handleCreateRevisi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPageError("");
    setSuccessMessage("");

    if (!selectedSkripsiId) {
      setPageError("Pilih skripsi terlebih dahulu.");
      return;
    }

    if (!revisiForm.catatan.trim()) {
      setPageError("Catatan revisi wajib diisi.");
      return;
    }

    createRevisiMutation.mutate();
  }

  function handleUploadRevisi(
    event: ChangeEvent<HTMLInputElement>,
    revisi: RevisiSidangItem
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadingKey(`revisi-${revisi.id}`);
    setPageError("");
    setSuccessMessage("");

    uploadRevisiMutation.mutate({
      revisiId: revisi.id,
      file
    });

    event.target.value = "";
  }

  function handleUploadFinal(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !selectedSkripsiId) return;

    setUploadingKey(`final-${selectedSkripsiId}`);
    setPageError("");
    setSuccessMessage("");

    uploadFinalMutation.mutate({
      skripsiId: selectedSkripsiId,
      file
    });

    event.target.value = "";
  }

  function handleUploadPengesahan(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !selectedSkripsiId) return;

    setUploadingKey(`pengesahan-${selectedSkripsiId}`);
    setPageError("");
    setSuccessMessage("");

    uploadPengesahanMutation.mutate({
      skripsiId: selectedSkripsiId,
      file
    });

    event.target.value = "";
  }

  function handleFinalDecision(decision: "APPROVE" | "TOLAK") {
    setPageError("");

    if (!selectedSkripsiId) {
      setPageError("Pilih skripsi terlebih dahulu.");
      return;
    }

    if (decision === "TOLAK" && !finalAlasan.trim()) {
      setPageError("Alasan penolakan final wajib diisi.");
      return;
    }

    finalDecisionMutation.mutate({
      decision,
      text: decision === "APPROVE" ? finalCatatan.trim() : finalAlasan.trim()
    });
  }

  const totalRevisi = revisiRows.length;
  const totalApproved = revisiRows.filter((item) =>
    ["DISETUJUI", "APPROVED", "APPROVE", "SELESAI"].includes(item.status)
  ).length;
  const totalUploaded = revisiRows.filter((item) => item.berkas).length;

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Finalisasi"
        title="Revisi & Finalisasi Skripsi"
        description="Kelola catatan revisi, upload berkas revisi, upload final skripsi, dan pengesahan akhir."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !drawerMode ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card revisi-summary-card">
        <div className="revisi-selector-row">
          <label>
            <span>Pilih Skripsi</span>
            <select
              value={selectedSkripsiId}
              onChange={(event) => {
                setSelectedSkripsiId(event.target.value);
                setPageError("");
                setSuccessMessage("");
              }}
            >
              {skripsiOptions.length === 0 ? (
                <option value="">Belum ada skripsi revisi/finalisasi</option>
              ) : (
                skripsiOptions.map((skripsi) => (
                  <option key={skripsi.id} value={skripsi.id}>
                    {skripsi.title || "Tanpa judul"} —{" "}
                    {skripsi.mahasiswa?.name || skripsi.mahasiswaId} —{" "}
                    {skripsi.status}
                  </option>
                ))
              )}
            </select>
          </label>

          {selectedSkripsi ? (
            <div className="nilai-selected-info">
              <strong>{selectedSkripsi.title || "Tanpa judul"}</strong>
              <span>
                {selectedSkripsi.mahasiswa?.name || "-"} •{" "}
                {selectedSkripsi.tahap} • {selectedSkripsi.status}
              </span>
            </div>
          ) : null}
        </div>

        <div className="metric-grid">
          <MetricCard
            label="Status"
            value={selectedSkripsi?.status || "-"}
            description="Status finalisasi skripsi"
          />
          <MetricCard
            label="Total Revisi"
            value={totalRevisi}
            description="Jumlah catatan revisi"
          />
          <MetricCard
            label="Berkas Revisi"
            value={totalUploaded}
            description="Revisi yang sudah upload berkas"
          />
          <MetricCard
            label="Revisi Approved"
            value={totalApproved}
            description="Revisi yang sudah disetujui"
          />
        </div>
      </section>

      <section className="list-card revisi-table-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Daftar Revisi Sidang</h2>
            <p className="muted">
              List catatan revisi, deadline, berkas, status, dan aksi review.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari catatan, status, pembuat..."
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="">Semua Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {canCreateRevisi && selectedSkripsiId ? (
              <button
                type="button"
                className="primary-button"
                onClick={openCreateRevisiDrawer}
              >
                Tambah Revisi
              </button>
            ) : null}

            {selectedSkripsiId ? (
              <button
                type="button"
                className="secondary-button"
                onClick={openFinalisasiDrawer}
              >
                Finalisasi
              </button>
            ) : null}
          </div>
        </div>

        {!selectedSkripsiId ? (
          <EmptyState
            title="Belum ada skripsi"
            description="Pilih skripsi terlebih dahulu untuk melihat revisi."
          />
        ) : revisiQuery.isLoading ? (
          <EmptyState
            title="Memuat revisi..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRevisiRows}
            emptyMessage="Belum ada revisi sidang"
            columns={[
              {
                key: "no",
                header: "No",
                align: "center",
                render: (_item, index) => index + 1
              },
              {
                key: "catatan",
                header: "Catatan",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{item.catatan}</strong>
                    <span>Dibuat oleh: {item.dibuatOleh?.name || "-"}</span>
                  </div>
                )
              },
              {
                key: "deadline",
                header: "Deadline",
                render: (item) => (
                  <div className="table-title-cell">
                    <strong>{formatDate(item.deadline)}</strong>
                    <span>
                      <StatusBadge
                        value={getDeadlineStatus(item.deadline)}
                        size="sm"
                      />
                    </span>
                  </div>
                )
              },
              {
                key: "berkas",
                header: "Berkas",
                render: (item) => getBerkasName(item)
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
                      onClick={() => openDetailRevisiDrawer(item)}
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

      {drawerMode ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside
            className="crud-drawer revisi-drawer"
            aria-label="Form revisi finalisasi"
          >
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">
                  {drawerMode === "create-revisi"
                    ? "Tambah Data"
                    : drawerMode === "detail-revisi"
                      ? "Detail Data"
                      : "Finalisasi"}
                </p>
                <h2>
                  {drawerMode === "create-revisi"
                    ? "Tambah Catatan Revisi"
                    : drawerMode === "detail-revisi"
                      ? "Detail Revisi"
                      : "Finalisasi Skripsi"}
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

            {drawerMode === "create-revisi" ? (
              <form className="form-stack" onSubmit={handleCreateRevisi}>
                <label>
                  <span>Catatan Revisi</span>
                  <textarea
                    value={revisiForm.catatan}
                    onChange={(event) =>
                      setRevisiForm((current) => ({
                        ...current,
                        catatan: event.target.value
                      }))
                    }
                    placeholder="Contoh: Perbaiki kesimpulan dan tambahkan batasan penelitian."
                    required
                  />
                </label>

                <label>
                  <span>Deadline</span>
                  <input
                    type="datetime-local"
                    value={revisiForm.deadline}
                    onChange={(event) =>
                      setRevisiForm((current) => ({
                        ...current,
                        deadline: event.target.value
                      }))
                    }
                  />
                </label>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={createRevisiMutation.isPending}
                >
                  {createRevisiMutation.isPending
                    ? "Menyimpan..."
                    : "Buat Revisi"}
                </button>
              </form>
            ) : drawerMode === "detail-revisi" && selectedRevisi ? (
              <div className="revisi-detail-stack">
                <div className="skripsi-detail-title">
                  <strong>{selectedRevisi.catatan}</strong>
                  <StatusBadge value={selectedRevisi.status} />
                </div>

                <div className="info-list">
                  <div className="info-row">
                    <span>Dibuat Oleh</span>
                    <strong>
                      {selectedRevisi.dibuatOleh?.name ||
                        selectedRevisi.dibuatOlehId}
                    </strong>
                  </div>

                  <div className="info-row">
                    <span>Deadline</span>
                    <strong>{formatDate(selectedRevisi.deadline)}</strong>
                  </div>

                  <div className="info-row">
                    <span>Berkas</span>
                    <p>{getBerkasName(selectedRevisi)}</p>
                  </div>

                  <div className="info-row">
                    <span>Approved By</span>
                    <strong>
                      {selectedRevisi.approvedBy?.name ||
                        selectedRevisi.approvedById ||
                        "-"}
                    </strong>
                  </div>

                  <div className="info-row">
                    <span>Approved At</span>
                    <strong>{formatDate(selectedRevisi.approvedAt)}</strong>
                  </div>
                </div>

                {selectedRevisi.berkas ? (
                  <FileDownloadButton
                    berkasId={selectedRevisi.berkas.id}
                    fileName={selectedRevisi.berkas.originalName}
                  />
                ) : null}

                {isMahasiswa && canUploadRevisi ? (
                  <div className="drawer-section">
                    <h3>Upload Berkas Revisi</h3>

                    <label className="upload-button">
                      {uploadingKey === `revisi-${selectedRevisi.id}`
                        ? "Mengupload..."
                        : selectedRevisi.berkas
                          ? "Upload Ulang Revisi"
                          : "Upload Revisi PDF"}
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(event) =>
                          handleUploadRevisi(event, selectedRevisi)
                        }
                      />
                    </label>
                  </div>
                ) : null}

                {canReviewRevisi && selectedRevisi.berkas ? (
                  <div className="drawer-section">
                    <h3>Review Revisi</h3>

                    <label>
                      <span>Catatan Review</span>
                      <textarea
                        value={reviewCatatan}
                        onChange={(event) => setReviewCatatan(event.target.value)}
                        placeholder="Catatan approval atau alasan penolakan"
                      />
                    </label>

                    <div className="page-actions">
                      <button
                        type="button"
                        className="primary-button"
                        disabled={reviewMutation.isPending}
                        onClick={() =>
                          reviewMutation.mutate({
                            revisiId: selectedRevisi.id,
                            decision: "APPROVE"
                          })
                        }
                      >
                        Approve Revisi
                      </button>

                      <button
                        type="button"
                        className="danger-button"
                        disabled={reviewMutation.isPending}
                        onClick={() =>
                          reviewMutation.mutate({
                            revisiId: selectedRevisi.id,
                            decision: "TOLAK"
                          })
                        }
                      >
                        Tolak Revisi
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : drawerMode === "finalisasi" ? (
              <div className="revisi-detail-stack">
                <div className="skripsi-detail-title">
                  <strong>{selectedSkripsi?.title || "Tanpa judul"}</strong>
                  <StatusBadge value={selectedSkripsi?.status || "-"} />
                </div>

                <div className="info-list">
                  <div className="info-row">
                    <span>Mahasiswa</span>
                    <strong>{selectedSkripsi?.mahasiswa?.name || "-"}</strong>
                  </div>

                  <div className="info-row">
                    <span>Tahap</span>
                    <strong>{selectedSkripsi?.tahap || "-"}</strong>
                  </div>

                  <div className="info-row">
                    <span>Status</span>
                    <strong>{selectedSkripsi?.status || "-"}</strong>
                  </div>
                </div>

                {isMahasiswa && canUploadBerkas ? (
                  <div className="drawer-section">
                    <h3>Upload Final Skripsi</h3>

                    <label className="upload-button">
                      {uploadingKey === `final-${selectedSkripsiId}`
                        ? "Mengupload..."
                        : "Upload Final Skripsi PDF"}
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleUploadFinal}
                      />
                    </label>
                  </div>
                ) : null}

                {canUploadBerkas && !isMahasiswa ? (
                  <div className="drawer-section">
                    <h3>Upload Lembar Pengesahan</h3>

                    <label className="upload-button">
                      {uploadingKey === `pengesahan-${selectedSkripsiId}`
                        ? "Mengupload..."
                        : "Upload Lembar Pengesahan PDF"}
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleUploadPengesahan}
                      />
                    </label>
                  </div>
                ) : null}

                {canApproveFinal ? (
                  <div className="drawer-section">
                    <h3>Approval Final</h3>

                    <label>
                      <span>Catatan Pengesahan</span>
                      <textarea
                        value={finalCatatan}
                        onChange={(event) => setFinalCatatan(event.target.value)}
                        placeholder="Catatan pengesahan final"
                      />
                    </label>

                    <label>
                      <span>Alasan Penolakan</span>
                      <textarea
                        value={finalAlasan}
                        onChange={(event) => setFinalAlasan(event.target.value)}
                        placeholder="Wajib diisi jika reject final"
                      />
                    </label>

                    <div className="page-actions">
                      <button
                        type="button"
                        className="primary-button"
                        disabled={finalDecisionMutation.isPending}
                        onClick={() => handleFinalDecision("APPROVE")}
                      >
                        Approve Final
                      </button>

                      <button
                        type="button"
                        className="danger-button"
                        disabled={finalDecisionMutation.isPending}
                        onClick={() => handleFinalDecision("TOLAK")}
                      >
                        Reject Final
                      </button>
                    </div>
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