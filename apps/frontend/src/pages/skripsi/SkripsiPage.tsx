import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import FileDownloadButton from "../../components/FileDownloadButton";
import StatusBadge from "../../components/ui/StatusBadge";

type SeminarBerkas = {
  id: string;
  kategori: string;
  status?: string | null;
  originalName?: string | null;
  fileName?: string | null;
  createdAt?: string | null;
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

function getSeminarBerkasOnly(berkas: SeminarBerkas[] = []) {
  const proposal = getLatestBerkasByKategori(berkas, "PROPOSAL");
  const presentasi = getLatestBerkasByKategori(berkas, "PRESENTASI");

  return [proposal, presentasi].filter(Boolean) as SeminarBerkas[];
}

function getBerkasName(berkas?: SeminarBerkas) {
  return berkas?.originalName || berkas?.fileName || "Berkas belum tersedia";
}

function canModifySeminarBerkas(status?: string | null) {
  return ["MENUNGGU_BERKAS", "MENUNGGU_APPROVAL"].includes(status || "");
}

export default function SkripsiPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: "",
    abstract: "",
    peminatanId: ""
  });

  const [uploadingKey, setUploadingKey] = useState("");

  const peminatanQuery = useQuery({
    queryKey: ["peminatan"],
    queryFn: getPeminatan
  });

  const seminarQuery = useQuery({
    queryKey: ["my-seminar-proposals"],
    queryFn: getMySeminarProposals
  });

  const registerMutation = useMutation({
    mutationFn: registerSeminarProposal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-seminar-proposals"] });
      setForm({
        title: "",
        abstract: "",
        peminatanId: ""
      });
    }
  });

  const proposalUploadMutation = useMutation({
    mutationFn: ({ skripsiId, file }: { skripsiId: string; file: File }) =>
      uploadProposalFile(skripsiId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-seminar-proposals"] });
      setUploadingKey("");
    },
    onError: () => {
      setUploadingKey("");
    }
  });

  const presentationUploadMutation = useMutation({
    mutationFn: ({ skripsiId, file }: { skripsiId: string; file: File }) =>
      uploadPresentationFile(skripsiId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-seminar-proposals"] });
      setUploadingKey("");
    },
    onError: () => {
      setUploadingKey("");
    }
  });

  const kodeEtikMutation = useMutation({
    mutationFn: (skripsiId: string) =>
      agreeKodeEtik(skripsiId, {
        statementVersion: "v1.0.0"
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-seminar-proposals"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-seminar-proposals"] });
    }
  });

  const skripsiList = seminarQuery.data ?? [];

  const hasActiveSkripsi = useMemo(
    () =>
      skripsiList.some(
        (item) => item.status !== "SELESAI" && item.status !== "DITOLAK"
      ),
    [skripsiList]
  );

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    registerMutation.mutate({
      title: form.title,
      abstract: form.abstract || undefined,
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

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Akademik</p>
        <h1>Skripsi Saya</h1>
        <p className="muted">
          Daftar seminar proposal, upload berkas, dan pantau status proses
          skripsi.
        </p>
      </div>

      {!hasActiveSkripsi ? (
        <form className="card form-stack" onSubmit={handleRegister}>
          <h2>Daftar Seminar Proposal</h2>

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

          {registerMutation.isError ? (
            <div className="alert-error">
              Gagal mendaftar seminar proposal. Pastikan data lengkap dan tidak
              ada proses skripsi aktif.
            </div>
          ) : null}
        </form>
      ) : (
        <div className="card">
          Anda sudah memiliki proses skripsi aktif. Selesaikan proses aktif
          sebelum membuat pendaftaran baru.
        </div>
      )}

      <div className="list-card">
        <h2>Riwayat Skripsi / Seminar Proposal</h2>

        {seminarQuery.isLoading ? (
          <p>Memuat data skripsi...</p>
        ) : skripsiList.length === 0 ? (
          <p>Belum ada data skripsi.</p>
        ) : (
          skripsiList.map((skripsi: SkripsiItem) => {
            const proposalBerkas = getLatestBerkasByKategori(
              skripsi.berkas ?? [],
              "PROPOSAL"
            );

            const presentasiBerkas = getLatestBerkasByKategori(
              skripsi.berkas ?? [],
              "PRESENTASI"
            );

            const proposalUploaded = Boolean(proposalBerkas);
            const presentasiUploaded = Boolean(presentasiBerkas);
            const kodeEtikAgreed = skripsi.kodeEtik.length > 0;
            const canModify = canModifySeminarBerkas(skripsi.status);
            const visibleBerkas = getSeminarBerkasOnly(skripsi.berkas ?? []);

            return (
              <article key={skripsi.id} className="academic-card">
                <div className="page-header-row">
                  <div>
                    <strong>{skripsi.title || "Tanpa judul"}</strong>
                    <p className="muted">
                      {skripsi.peminatan?.name || "-"} • {skripsi.tahap}
                    </p>
                    <small>Dibuat: {formatDate(skripsi.createdAt)}</small>
                  </div>

                  <StatusBadge value={skripsi.status} />
                </div>

                <p>{skripsi.abstract || "Belum ada abstrak."}</p>

                <div className="workflow-grid">
                  <div className="workflow-step">
                    <strong>Proposal PDF</strong>

                    <StatusBadge
                      value={proposalBerkas?.status || "BELUM_UPLOAD"}
                      size="sm"
                    />

                    {proposalBerkas ? (
                      <p className="muted">{getBerkasName(proposalBerkas)}</p>
                    ) : null}

                    <div className="row-inline">
                      <label className="upload-button">
                        {uploadingKey === `${skripsi.id}-proposal`
                          ? "Mengupload..."
                          : proposalUploaded
                            ? "Upload Ulang Proposal"
                            : "Upload Proposal"}
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(event) =>
                            handleProposalChange(event, skripsi.id)
                          }
                          hidden
                          disabled={!canModify}
                        />
                      </label>

                      {proposalBerkas ? (
                        <button
                          type="button"
                          className="secondary-button danger-button"
                          onClick={() =>
                            handleDeleteBerkas(skripsi.id, "PROPOSAL")
                          }
                          disabled={!canModify || deleteBerkasMutation.isPending}
                        >
                          Hapus
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="workflow-step">
                    <strong>Presentasi PDF</strong>

                    <StatusBadge
                      value={presentasiBerkas?.status || "BELUM_UPLOAD"}
                      size="sm"
                    />

                    {presentasiBerkas ? (
                      <p className="muted">
                        {getBerkasName(presentasiBerkas)}
                      </p>
                    ) : null}

                    <div className="row-inline">
                      <label className="upload-button">
                        {uploadingKey === `${skripsi.id}-presentasi`
                          ? "Mengupload..."
                          : presentasiUploaded
                            ? "Upload Ulang Presentasi"
                            : "Upload Presentasi"}
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={(event) =>
                            handlePresentationChange(event, skripsi.id)
                          }
                          hidden
                          disabled={!canModify}
                        />
                      </label>

                      {presentasiBerkas ? (
                        <button
                          type="button"
                          className="secondary-button danger-button"
                          onClick={() =>
                            handleDeleteBerkas(skripsi.id, "PRESENTASI")
                          }
                          disabled={!canModify || deleteBerkasMutation.isPending}
                        >
                          Hapus
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="workflow-step">
                    <strong>Kode Etik</strong>

                    <StatusBadge
                      value={kodeEtikAgreed ? "DISETUJUI" : "BELUM_SETUJU"}
                      size="sm"
                    />

                    <button
                      type="button"
                      className="secondary-button"
                      disabled={
                        kodeEtikAgreed || kodeEtikMutation.isPending || !canModify
                      }
                      onClick={() => kodeEtikMutation.mutate(skripsi.id)}
                    >
                      {kodeEtikAgreed ? "Sudah Setuju" : "Setujui Kode Etik"}
                    </button>
                  </div>
                </div>

                <div className="mini-section">
                  <h3>Berkas</h3>

                  {visibleBerkas.length === 0 ? (
                    <p className="muted">Belum ada berkas.</p>
                  ) : (
                    <div className="mini-list">
                      {visibleBerkas.map((berkas) => (
                        <div key={berkas.id} className="mini-list-item">
                          <strong>{berkas.kategori}</strong>
                          <span>{getBerkasName(berkas)}</span>
                          <StatusBadge value={berkas.status} size="sm" />

                          <div className="row-inline">
                            <FileDownloadButton
                              berkasId={berkas.id}
                              fileName={getBerkasName(berkas)}
                            />

                            <button
                              type="button"
                              className="secondary-button danger-button"
                              onClick={() =>
                                handleDeleteBerkas(
                                  skripsi.id,
                                  berkas.kategori as SeminarBerkasKategori
                                )
                              }
                              disabled={
                                !canModify || deleteBerkasMutation.isPending
                              }
                            >
                              Hapus
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mini-section">
                  <h3>Dosen</h3>

                  {skripsi.dosenSkripsi.length === 0 ? (
                    <p className="muted">
                      Dosen penguji/pembimbing belum ditentukan.
                    </p>
                  ) : (
                    <div className="mini-list">
                      {skripsi.dosenSkripsi.map((item) => (
                        <div key={item.id} className="mini-list-item">
                          <strong>{item.peran}</strong>
                          <span>{item.dosen.name}</span>
                          <small>{item.dosen.identifier}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {skripsi.suratPerjanjian.length > 0 ? (
                  <div className="mini-section">
                    <h3>Surat Perjanjian</h3>

                    {skripsi.suratPerjanjian.map((item) => (
                      <div key={item.id} className="mini-list-item">
                        <strong>{item.berkas.originalName}</strong>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}