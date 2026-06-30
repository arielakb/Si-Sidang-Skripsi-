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
  uploadSuratPerjanjianSidang,
  type SidangItem
} from "../../services/sidang";
import { getApiErrorMessage } from "../../utils/apiError";

function formatDateTime(value?: string | null) {
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

function getSuratPerjanjianFiles(item: SidangItem) {
  return (item.berkas ?? []).filter(
    (berkas) => berkas.kategori === "SURAT_PERJANJIAN"
  );
}

function getLatestSurat(item: SidangItem) {
  return getSuratPerjanjianFiles(item)[0] ?? null;
}

export default function SeminarProposalSuratPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canReadSidang = hasPermission("sidang.read");
  const canUploadSurat = hasPermission("sidang.upload_surat");
  const canDownloadBerkas = hasPermission("berkas.download");

  const [selectedSidang, setSelectedSidang] = useState<SidangItem | null>(null);
  const [search, setSearch] = useState("");
  const [uploadingSidangId, setUploadingSidangId] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sidangQuery = useQuery({
    queryKey: ["sidang", "seminar-proposal", "surat-perjanjian"],
    queryFn: () =>
      getSidangList({
        jenis: "SEMINAR_PROPOSAL",
        limit: 100
      }),
    enabled: canReadSidang
  });

  const sidangRows = sidangQuery.data?.data ?? [];

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();

    return sidangRows.filter((item) =>
      `${item.skripsi?.title ?? ""} ${item.skripsi?.mahasiswa?.name ?? ""} ${
        item.skripsi?.mahasiswa?.identifier ?? ""
      } ${item.status ?? ""} ${item.hasil ?? ""} ${getPengujiLabels(item)} ${
        getLatestSurat(item)?.originalName ?? ""
      }`
        .toLowerCase()
        .includes(keyword)
    );
  }, [sidangRows, search]);

  const uploadMutation = useMutation({
    mutationFn: ({ sidangId, file }: { sidangId: string; file: File }) =>
      uploadSuratPerjanjianSidang(sidangId, file),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-proposal", "surat-perjanjian"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-proposal", "hasil"]
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

      setUploadingSidangId("");
      setPageError("");
      setSuccessMessage("Surat perjanjian skripsi berhasil diupload.");
    },
    onError: (error) => {
      setUploadingSidangId("");
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal upload surat perjanjian. Pastikan seminar proposal sudah LOLOS dan Anda adalah penguji aktif."
        )
      );
    }
  });

  function openDetail(item: SidangItem) {
    setSelectedSidang(item);
    setPageError("");
    setSuccessMessage("");
  }

  function closeDetail() {
    setSelectedSidang(null);
    setPageError("");
  }

  function handleUploadSurat(
    event: ChangeEvent<HTMLInputElement>,
    sidang: SidangItem
  ) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    if (sidang.hasil !== "LOLOS") {
      setPageError("Surat perjanjian hanya bisa diupload setelah hasil seminar proposal LOLOS.");
      return;
    }

    setUploadingSidangId(sidang.id);
    setPageError("");
    setSuccessMessage("");

    uploadMutation.mutate({
      sidangId: sidang.id,
      file
    });
  }

  if (!canReadSidang) {
    return (
      <section className="page-stack">
        <div className="alert-error">
          Anda tidak memiliki akses ke halaman surat perjanjian seminar proposal.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Workflow Sidang"
        title="Surat Perjanjian Skripsi"
        description="Upload dan download surat perjanjian skripsi setelah seminar proposal dinyatakan lolos."
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
            <h2>Daftar Surat Perjanjian</h2>
            <p className="muted">
              Surat hanya bisa diupload oleh penguji aktif setelah hasil seminar proposal LOLOS.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, mahasiswa, penguji, file..."
            />
          </div>
        </div>

        {sidangQuery.isLoading ? (
          <EmptyState
            title="Memuat surat perjanjian..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredRows}
            emptyMessage="Belum ada data seminar proposal"
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
                key: "surat",
                header: "Surat",
                render: (item) => {
                  const surat = getLatestSurat(item);

                  return (
                    <div className="table-title-cell">
                      <strong>{surat?.originalName || "Belum ada surat"}</strong>
                      <span>
                        {surat
                          ? `${surat.status} • ${formatDateTime(surat.createdAt)}`
                          : "Menunggu upload penguji"}
                      </span>
                    </div>
                  );
                }
              },
              {
                key: "penguji",
                header: "Penguji",
                render: (item) => getPengujiLabels(item)
              },
              {
                key: "actions",
                header: "Aksi",
                align: "right",
                render: (item) => {
                  const surat = getLatestSurat(item);
                  const canUploadThis = canUploadSurat && item.hasil === "LOLOS";

                  return (
                    <div className="table-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => openDetail(item)}
                      >
                        Detail
                      </button>

                      {surat && canDownloadBerkas ? (
                        <FileDownloadButton
                          berkasId={surat.id}
                          fileName={surat.originalName || "Surat Perjanjian"}
                        />
                      ) : null}

                      {canUploadThis ? (
                        <label className="secondary-button upload-inline-button">
                          {uploadingSidangId === item.id
                            ? "Mengupload..."
                            : surat
                              ? "Upload Ulang"
                              : "Upload Surat"}
                          <input
                            type="file"
                            accept="application/pdf"
                            disabled={uploadMutation.isPending}
                            onChange={(event) => handleUploadSurat(event, item)}
                          />
                        </label>
                      ) : null}
                    </div>
                  );
                }
              }
            ]}
          />
        )}
      </section>

      {selectedSidang ? (
        <div className="crud-drawer-backdrop" role="presentation">
          <aside className="crud-drawer" aria-label="Detail surat perjanjian">
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">Seminar Proposal</p>
                <h2>Detail Surat Perjanjian</h2>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closeDetail}
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
                <span>Status Sidang</span>
                <StatusBadge value={selectedSidang.status} size="sm" />
              </div>

              <div className="info-row">
                <span>Hasil</span>
                {selectedSidang.hasil ? (
                  <StatusBadge value={selectedSidang.hasil} size="sm" />
                ) : (
                  <strong>-</strong>
                )}
              </div>

              <div className="info-row">
                <span>Penguji</span>
                <p>{getPengujiLabels(selectedSidang)}</p>
              </div>
            </div>

            <div className="drawer-section">
              <h3>Riwayat Surat</h3>

              {getSuratPerjanjianFiles(selectedSidang).length > 0 ? (
                <div className="file-list">
                  {getSuratPerjanjianFiles(selectedSidang).map((surat) => (
                    <div key={surat.id} className="file-row">
                      <div>
                        <strong>{surat.originalName || "Surat Perjanjian"}</strong>
                        <small>
                          {surat.status} • {formatDateTime(surat.createdAt)}
                        </small>
                      </div>

                      {canDownloadBerkas ? (
                        <FileDownloadButton
                          berkasId={surat.id}
                          fileName={surat.originalName || "Surat Perjanjian"}
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted">Belum ada surat perjanjian yang diupload.</p>
              )}
            </div>

            {canUploadSurat && selectedSidang.hasil === "LOLOS" ? (
              <div className="drawer-section">
                <h3>Upload Surat</h3>
                <p className="muted">
                  Upload PDF surat perjanjian skripsi. File lama tetap tersimpan
                  sebagai riwayat.
                </p>

                <label className="upload-button">
                  {uploadingSidangId === selectedSidang.id
                    ? "Mengupload..."
                    : "Upload Surat Perjanjian PDF"}
                  <input
                    type="file"
                    accept="application/pdf"
                    disabled={uploadMutation.isPending}
                    onChange={(event) => handleUploadSurat(event, selectedSidang)}
                  />
                </label>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}