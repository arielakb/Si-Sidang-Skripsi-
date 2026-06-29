import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import FileDownloadButton from "../../components/FileDownloadButton";
import DataTable from "../../components/ui/DataTable";
import EmptyState from "../../components/ui/EmptyState";
import PageHeader from "../../components/ui/PageHeader";
import StatusBadge from "../../components/ui/StatusBadge";
import { getPeminatan } from "../../services/masterData";
import {
  agreeKodeEtik,
  deleteSeminarBerkas,
  getMySeminarProposals,
  registerSeminarProposal,
  uploadPresentationFile,
  uploadProposalFile,
  type SeminarBerkasKategori
} from "../../services/seminarProposal";
import type { SkripsiItem } from "../../types/academic";
import { getApiErrorMessage } from "../../utils/apiError";

type SeminarBerkas = {
  id: string;
  kategori: string;
  status?: string | null;
  originalName?: string | null;
  fileName?: string | null;
  createdAt?: string | null;
};

type DrawerMode = "create" | "detail" | null;

const emptyForm = {
  title: "",
  abstract: "",
  peminatanId: ""
};

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function getLatestBerkasByKategori(
  berkas: SeminarBerkas[] = [],
  kategori: SeminarBerkasKategori
) {
  return [...berkas]
    .filter((item) => item.kategori === kategori)
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bTime - aTime;
    })[0];
}
function getBerkasName(berkas?: SeminarBerkas) {
  return berkas?.originalName || berkas?.fileName || "Berkas belum tersedia";
}

function canModifySeminarBerkas(status?: string | null) {
  return ["MENUNGGU_BERKAS", "MENUNGGU_APPROVAL", "MENUNGGU_REVISI"].includes(
    status || ""
  );
}

function getCompletenessLabel(skripsi: SkripsiItem) {
  const proposal = getLatestBerkasByKategori(skripsi.berkas ?? [], "PROPOSAL");
  const presentasi = getLatestBerkasByKategori(
    skripsi.berkas ?? [],
    "PRESENTASI"
  );
  const kodeEtik = (skripsi.kodeEtik ?? []).length > 0;

  const count = [proposal, presentasi, kodeEtik].filter(Boolean).length;

  return `${count}/3`;
}

function getCompletenessStatus(skripsi: SkripsiItem) {
  return getCompletenessLabel(skripsi) === "3/3" ? "LENGKAP" : "BELUM_LENGKAP";
}

export default function SkripsiPage() {
  const queryClient = useQueryClient();

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedSkripsi, setSelectedSkripsi] = useState<SkripsiItem | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [uploadingKey, setUploadingKey] = useState("");
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState(emptyForm);

  const peminatanQuery = useQuery({
    queryKey: ["peminatan"],
    queryFn: getPeminatan
  });

  const seminarQuery = useQuery({
    queryKey: ["my-seminar-proposals"],
    queryFn: getMySeminarProposals
  });

  const skripsiList = seminarQuery.data ?? [];

  const filteredSkripsiList = useMemo(() => {
    const keyword = search.toLowerCase();

    return skripsiList.filter((item) =>
      `${item.title ?? ""} ${item.abstract ?? ""} ${item.peminatan?.name ?? ""} ${
        item.tahap ?? ""
      } ${item.status ?? ""}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [skripsiList, search]);

  const hasActiveSkripsi = useMemo(
    () =>
      skripsiList.some(
        (item) => item.status !== "SELESAI" && item.status !== "DITOLAK"
      ),
    [skripsiList]
  );

  const registerMutation = useMutation({
    mutationFn: registerSeminarProposal,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["my-seminar-proposals"]
      });

      setForm(emptyForm);
      setDrawerMode(null);
      setPageError("");
      setSuccessMessage("Pendaftaran seminar proposal berhasil dibuat.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(
        getApiErrorMessage(
          error,
          "Gagal mendaftar seminar proposal. Pastikan data lengkap dan tidak ada proses skripsi aktif."
        )
      );
    }
  });

  const proposalUploadMutation = useMutation({
    mutationFn: ({ skripsiId, file }: { skripsiId: string; file: File }) =>
      uploadProposalFile(skripsiId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["my-seminar-proposals"]
      });

      setUploadingKey("");
      setPageError("");
      setSuccessMessage("Berkas proposal berhasil diupload.");
    },
    onError: (error) => {
      setUploadingKey("");
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal upload proposal."));
    }
  });

  const presentationUploadMutation = useMutation({
    mutationFn: ({ skripsiId, file }: { skripsiId: string; file: File }) =>
      uploadPresentationFile(skripsiId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["my-seminar-proposals"]
      });

      setUploadingKey("");
      setPageError("");
      setSuccessMessage("Berkas presentasi berhasil diupload.");
    },
    onError: (error) => {
      setUploadingKey("");
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal upload presentasi."));
    }
  });

  const kodeEtikMutation = useMutation({
    mutationFn: (skripsiId: string) =>
      agreeKodeEtik(skripsiId, {
        statementVersion: "v1.0.0"
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["my-seminar-proposals"]
      });

      setPageError("");
      setSuccessMessage("Kode etik berhasil disetujui.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal menyetujui kode etik."));
    }
  });

  const deleteBerkasMutation = useMutation({
    mutationFn: ({
      skripsiId,
      kategori
    }: {
      skripsiId: string;
      kategori: SeminarBerkasKategori;
    }) => deleteSeminarBerkas(skripsiId, kategori),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["my-seminar-proposals"]
      });

      setPageError("");
      setSuccessMessage("Berkas berhasil dihapus.");
    },
    onError: (error) => {
      setSuccessMessage("");
      setPageError(getApiErrorMessage(error, "Gagal menghapus berkas."));
    }
  });

  function openCreateDrawer() {
    setForm(emptyForm);
    setSelectedSkripsi(null);
    setPageError("");
    setSuccessMessage("");
    setDrawerMode("create");
  }

  function openDetailDrawer(skripsi: SkripsiItem) {
    setSelectedSkripsi(skripsi);
    setPageError("");
    setSuccessMessage("");
    setDrawerMode("detail");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setSelectedSkripsi(null);
    setForm(emptyForm);
    setUploadingKey("");
    setPageError("");
  }

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setPageError("");
    setSuccessMessage("");

    registerMutation.mutate({
      title: form.title.trim(),
      abstract: form.abstract.trim() || undefined,
      peminatanId: form.peminatanId
    });
  }

  function handleProposalChange(
    event: ChangeEvent<HTMLInputElement>,
    skripsiId: string
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadingKey(`${skripsiId}-proposal`);
    setPageError("");
    setSuccessMessage("");

    proposalUploadMutation.mutate({
      skripsiId,
      file
    });

    event.target.value = "";
  }

  function handlePresentationChange(
    event: ChangeEvent<HTMLInputElement>,
    skripsiId: string
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadingKey(`${skripsiId}-presentasi`);
    setPageError("");
    setSuccessMessage("");

    presentationUploadMutation.mutate({
      skripsiId,
      file
    });

    event.target.value = "";
  }

  async function handleDeleteBerkas(
    skripsiId: string,
    kategori: SeminarBerkasKategori
  ) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus berkas ${kategori.toLowerCase()}?`
    );

    if (!confirmed) return;

    await deleteBerkasMutation.mutateAsync({
      skripsiId,
      kategori
    });
  }

  const latestSelectedSkripsi =
    selectedSkripsi
      ? skripsiList.find((item) => item.id === selectedSkripsi.id) ??
        selectedSkripsi
      : null;

  const proposalBerkas = latestSelectedSkripsi
    ? getLatestBerkasByKategori(latestSelectedSkripsi.berkas ?? [], "PROPOSAL")
    : undefined;

  const presentasiBerkas = latestSelectedSkripsi
    ? getLatestBerkasByKategori(
        latestSelectedSkripsi.berkas ?? [],
        "PRESENTASI"
      )
    : undefined;

  const kodeEtikAgreed = latestSelectedSkripsi
    ? (latestSelectedSkripsi.kodeEtik ?? []).length > 0
    : false;

  const canModify = canModifySeminarBerkas(latestSelectedSkripsi?.status);

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Akademik"
        title="Skripsi Saya"
        description="Kelola pendaftaran seminar proposal, kelengkapan berkas, dan status skripsi."
      />

      {successMessage ? (
        <div className="state-card success">{successMessage}</div>
      ) : null}

      {pageError && !drawerMode ? (
        <div className="alert-error">{pageError}</div>
      ) : null}

      <section className="list-card skripsi-table-card">
        <div className="table-toolbar master-table-toolbar">
          <div>
            <h2>Daftar Skripsi</h2>
            <p className="muted">
              List skripsi dan seminar proposal mahasiswa dalam bentuk table.
            </p>
          </div>

          <div className="master-toolbar-actions">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari judul, status, atau peminatan..."
            />

            <button
              type="button"
              className="primary-button"
              onClick={openCreateDrawer}
              disabled={hasActiveSkripsi}
              title={
                hasActiveSkripsi
                  ? "Selesaikan skripsi aktif sebelum membuat pendaftaran baru."
                  : "Daftar seminar proposal"
              }
            >
              Daftar Seminar Proposal
            </button>
          </div>
        </div>

        {hasActiveSkripsi ? (
          <div className="state-card skripsi-info-card">
            Anda sudah memiliki proses skripsi aktif. Tombol daftar seminar
            proposal akan aktif kembali setelah proses selesai atau ditolak.
          </div>
        ) : null}

        {seminarQuery.isLoading ? (
          <EmptyState
            title="Memuat data skripsi..."
            description="Mohon tunggu sebentar."
          />
        ) : (
          <DataTable
            data={filteredSkripsiList}
            emptyMessage="Belum ada data skripsi"
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
                key: "peminatan",
                header: "Peminatan",
                render: (item) => item.peminatan?.name || "-"
              },
              {
                key: "tahap",
                header: "Tahap",
                render: (item) => item.tahap || "-"
              },
              {
                key: "status",
                header: "Status",
                align: "center",
                render: (item) => <StatusBadge value={item.status} size="sm" />
              },
              {
                key: "berkas",
                header: "Berkas",
                align: "center",
                render: (item) => (
                  <div className="table-berkas-cell">
                    <strong>{getCompletenessLabel(item)}</strong>
                    <StatusBadge value={getCompletenessStatus(item)} size="sm" />
                  </div>
                )
              },
              {
                key: "dosen",
                header: "Dosen",
                align: "center",
                render: (item) => (item.dosenSkripsi ?? []).length
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
                      Kelola
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
          <aside className="crud-drawer skripsi-drawer" aria-label="Form skripsi">
            <div className="crud-drawer-head">
              <div>
                <p className="eyebrow">
                  {drawerMode === "create" ? "Tambah Data" : "Detail Skripsi"}
                </p>
                <h2>
                  {drawerMode === "create"
                    ? "Daftar Seminar Proposal"
                    : "Kelola Skripsi"}
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

            {drawerMode === "create" ? (
              <form className="form-stack" onSubmit={handleRegister}>
                <label>
                  <span>Judul</span>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        title: event.target.value
                      }))
                    }
                    placeholder="Judul skripsi"
                    required
                  />
                </label>

                <label>
                  <span>Abstrak Singkat</span>
                  <textarea
                    value={form.abstract}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        abstract: event.target.value
                      }))
                    }
                    placeholder="Ringkasan penelitian"
                  />
                </label>

                <label>
                  <span>Peminatan</span>
                  <select
                    value={form.peminatanId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        peminatanId: event.target.value
                      }))
                    }
                    required
                  >
                    <option value="">Pilih peminatan</option>
                    {(peminatanQuery.data ?? []).map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending
                    ? "Mendaftarkan..."
                    : "Daftar Seminar Proposal"}
                </button>
              </form>
            ) : latestSelectedSkripsi ? (
              <div className="skripsi-detail-stack">
                <div className="skripsi-detail-title">
                  <strong>{latestSelectedSkripsi.title || "Tanpa judul"}</strong>
                  <StatusBadge value={latestSelectedSkripsi.status} />
                </div>

                <div className="info-list">
                  <div className="info-row">
                    <span>Peminatan</span>
                    <strong>{latestSelectedSkripsi.peminatan?.name || "-"}</strong>
                  </div>

                  <div className="info-row">
                    <span>Tahap</span>
                    <strong>{latestSelectedSkripsi.tahap || "-"}</strong>
                  </div>

                  <div className="info-row">
                    <span>Dibuat</span>
                    <strong>{formatDate(latestSelectedSkripsi.createdAt)}</strong>
                  </div>

                  <div className="info-row">
                    <span>Abstrak</span>
                    <p>{latestSelectedSkripsi.abstract || "Belum ada abstrak."}</p>
                  </div>
                </div>

                <div className="drawer-section">
                  <h3>Kelengkapan Berkas</h3>

                  <div className="file-list">
                    <div className="file-row">
                      <div className="file-row-main">
                        <strong>Proposal PDF</strong>
                        <span>{getBerkasName(proposalBerkas)}</span>
                      </div>

                      <StatusBadge
                        value={proposalBerkas?.status || "BELUM_UPLOAD"}
                        size="sm"
                      />

                      <div className="file-row-actions">
                        {proposalBerkas ? (
                          <FileDownloadButton
                            berkasId={proposalBerkas.id}
                            fileName={getBerkasName(proposalBerkas)}
                          />
                        ) : null}

                        <label className="upload-button">
                          {uploadingKey === `${latestSelectedSkripsi.id}-proposal`
                            ? "Mengupload..."
                            : proposalBerkas
                              ? "Upload Ulang"
                              : "Upload"}
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(event) =>
                              handleProposalChange(
                                event,
                                latestSelectedSkripsi.id
                              )
                            }
                            disabled={!canModify}
                          />
                        </label>

                        {proposalBerkas ? (
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() =>
                              handleDeleteBerkas(
                                latestSelectedSkripsi.id,
                                "PROPOSAL"
                              )
                            }
                            disabled={!canModify || deleteBerkasMutation.isPending}
                          >
                            Hapus
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="file-row">
                      <div className="file-row-main">
                        <strong>Presentasi PDF</strong>
                        <span>{getBerkasName(presentasiBerkas)}</span>
                      </div>

                      <StatusBadge
                        value={presentasiBerkas?.status || "BELUM_UPLOAD"}
                        size="sm"
                      />

                      <div className="file-row-actions">
                        {presentasiBerkas ? (
                          <FileDownloadButton
                            berkasId={presentasiBerkas.id}
                            fileName={getBerkasName(presentasiBerkas)}
                          />
                        ) : null}

                        <label className="upload-button">
                          {uploadingKey ===
                          `${latestSelectedSkripsi.id}-presentasi`
                            ? "Mengupload..."
                            : presentasiBerkas
                              ? "Upload Ulang"
                              : "Upload"}
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(event) =>
                              handlePresentationChange(
                                event,
                                latestSelectedSkripsi.id
                              )
                            }
                            disabled={!canModify}
                          />
                        </label>

                        {presentasiBerkas ? (
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() =>
                              handleDeleteBerkas(
                                latestSelectedSkripsi.id,
                                "PRESENTASI"
                              )
                            }
                            disabled={!canModify || deleteBerkasMutation.isPending}
                          >
                            Hapus
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="file-row">
                      <div className="file-row-main">
                        <strong>Kode Etik</strong>
                        <span>
                          {kodeEtikAgreed
                            ? "Mahasiswa sudah menyetujui kode etik."
                            : "Kode etik belum disetujui."}
                        </span>
                      </div>

                      <StatusBadge
                        value={kodeEtikAgreed ? "DISETUJUI" : "BELUM_SETUJU"}
                        size="sm"
                      />

                      <div className="file-row-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={
                            kodeEtikAgreed ||
                            kodeEtikMutation.isPending ||
                            !canModify
                          }
                          onClick={() =>
                            kodeEtikMutation.mutate(latestSelectedSkripsi.id)
                          }
                        >
                          {kodeEtikAgreed ? "Sudah Setuju" : "Setujui"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="drawer-section">
                  <h3>Dosen</h3>

                  {(latestSelectedSkripsi.dosenSkripsi ?? []).length === 0 ? (
                    <p className="muted">
                      Dosen penguji atau pembimbing belum ditentukan.
                    </p>
                  ) : (
                    <div className="mini-list">
                      {(latestSelectedSkripsi.dosenSkripsi ?? []).map((item) => (
                        <div key={item.id} className="mini-list-item">
                          <strong>{item.peran}</strong>
                          <span>{item.dosen.name}</span>
                          <small>{item.dosen.identifier}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {(latestSelectedSkripsi.suratPerjanjian ?? []).length > 0 ? (
                  <div className="drawer-section">
                    <h3>Surat Perjanjian</h3>

                    {(latestSelectedSkripsi.suratPerjanjian ?? []).map((item) => (
                      <div key={item.id} className="mini-list-item">
                        <strong>{item.berkas.originalName}</strong>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    ))}
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