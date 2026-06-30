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
  uploadBerkasSidang,
  type SidangItem
} from "../../services/sidang";
import { getApiErrorMessage } from "../../utils/apiError";

type SeminarHasilKategori = "SIDANG_SOFTCOPY" | "SIDANG_PRESENTASI";

function formatDateTime(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getLatestBerkas(item: SidangItem, kategori: SeminarHasilKategori) {
  return (item.berkas ?? []).find((berkas) => berkas.kategori === kategori);
}

function isActiveSidang(item: SidangItem) {
  return !["SELESAI", "DIBATALKAN"].includes(String(item.status || ""));
}

function getPengujiLabels(item: SidangItem) {
  const rows = item.dosen ?? [];

  if (rows.length === 0) return "Belum ada penguji";

  return rows
    .map((row) => `${row.peran}: ${row.dosen?.name || row.dosenId}`)
    .join(", ");
}

export default function SeminarHasilBerkasPage() {
  const { hasPermission, hasRole } = useAuth();
  const queryClient = useQueryClient();

  const canReadSidang = hasPermission("sidang.read");
  const canUploadBerkas = hasPermission("berkas.upload") && hasRole(["mahasiswa"]);
  const canDownloadBerkas = hasPermission("berkas.download");

  const [search, setSearch] = useState("");
  const [uploadingKey, setUploadingKey] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const sidangQuery = useQuery({
    queryKey: ["sidang", "seminar-hasil", "berkas"],
    queryFn: () =>
      getSidangList({
        jenis: "SEMINAR_HASIL",
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
      } ${item.status ?? ""} ${item.hasil ?? ""} ${getPengujiLabels(item)}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [sidangRows, search]);

  const uploadMutation = useMutation({
    mutationFn: ({
      sidangId,
      kategori,
      file
    }: {
      sidangId: string;
      kategori: SeminarHasilKategori;
      file: File;
    }) => uploadBerkasSidang(sidangId, kategori, file),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-hasil", "berkas"]
        }),
        queryClient.invalidateQueries({
          queryKey: ["sidang", "seminar-hasil", "penguji"]
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

      setUploadingKey("");
      setPageError("");
      setSuccessMessage("Berkas seminar hasil berhasil diupload.");
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

  function handleUpload(
    event: ChangeEvent<HTMLInputElement>,
    item: SidangItem,
    kategori: SeminarHasilKategori
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
          Anda tidak memiliki akses ke halaman berkas seminar hasil.
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Seminar Hasil"
        title="Upload Berkas Seminar Hasil"
        description="Mahasiswa mengupload softcopy skripsi dan presentasi untuk proses seminar hasil."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError ? <div className="alert-error">{pageError}</div> : null}

      <section className="list-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Daftar Seminar Hasil</h2>
            <p className="muted">
              Setelah berkas lengkap, koordinator dapat assign penguji dan membuat jadwal seminar hasil.
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
                render: (item) => {
                  const softcopy = getLatestBerkas(item, "SIDANG_SOFTCOPY");
                  const presentasi = getLatestBerkas(item, "SIDANG_PRESENTASI");

                  return (
                    <div className="table-title-cell">
                      <strong>
                        {softcopy ? "Softcopy ada" : "Softcopy belum ada"}
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
                key: "penguji",
                header: "Penguji",
                render: (item) => getPengujiLabels(item)
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
                key: "createdAt",
                header: "Dibuat",
                render: (item) => formatDateTime(item.createdAt)
              },
              {
                key: "actions",
                header: "Aksi",
                align: "right",
                render: (item) => {
                  const softcopy = getLatestBerkas(item, "SIDANG_SOFTCOPY");
                  const presentasi = getLatestBerkas(item, "SIDANG_PRESENTASI");
                  const active = isActiveSidang(item);

                  return (
                    <div className="table-actions">
                      {softcopy && canDownloadBerkas ? (
                        <FileDownloadButton
                          berkasId={softcopy.id}
                          fileName={softcopy.originalName || "Softcopy Skripsi"}
                        />
                      ) : null}

                      {presentasi && canDownloadBerkas ? (
                        <FileDownloadButton
                          berkasId={presentasi.id}
                          fileName={presentasi.originalName || "Presentasi"}
                        />
                      ) : null}

                      {canUploadBerkas && active ? (
                        <>
                          <label className="secondary-button upload-inline-button">
                            {uploadingKey === `${item.id}-SIDANG_SOFTCOPY`
                              ? "Upload..."
                              : softcopy
                                ? "Upload Ulang Softcopy"
                                : "Upload Softcopy"}
                            <input
                              type="file"
                              accept="application/pdf"
                              disabled={uploadMutation.isPending}
                              onChange={(event) =>
                                handleUpload(event, item, "SIDANG_SOFTCOPY")
                              }
                            />
                          </label>

                          <label className="secondary-button upload-inline-button">
                            {uploadingKey === `${item.id}-SIDANG_PRESENTASI`
                              ? "Upload..."
                              : presentasi
                                ? "Upload Ulang Presentasi"
                                : "Upload Presentasi"}
                            <input
                              type="file"
                              accept="application/pdf"
                              disabled={uploadMutation.isPending}
                              onChange={(event) =>
                                handleUpload(event, item, "SIDANG_PRESENTASI")
                              }
                            />
                          </label>
                        </>
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