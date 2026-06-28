import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
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
import StatusBadge from "../../components/ui/StatusBadge";

function formatDate(value?: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export default function RevisiFinalisasiPage() {
  const { hasRole, hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const isMahasiswa = hasRole("mahasiswa");
  const canCreateRevisi = hasPermission("revisi.create");
  const canReviewRevisi = hasPermission("revisi.approve");
  const canApproveFinal = hasPermission("skripsi.approve_final");
  const canUploadBerkas = hasPermission("berkas.upload");

  const [selectedSkripsiId, setSelectedSkripsiId] = useState("");
  const [revisiForm, setRevisiForm] = useState({
    catatan: "",
    deadline: ""
  });
  const [uploadingKey, setUploadingKey] = useState("");

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

  const revisiQuery = useQuery({
    queryKey: ["revisi-sidang", selectedSkripsiId],
    queryFn: () => getRevisiSidangBySkripsi(selectedSkripsiId),
    enabled: Boolean(selectedSkripsiId)
  });

  const createRevisiMutation = useMutation({
    mutationFn: () =>
      createRevisiSidang(selectedSkripsiId, {
        catatan: revisiForm.catatan,
        deadline: revisiForm.deadline
          ? new Date(revisiForm.deadline).toISOString()
          : null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisi-sidang"] });
      setRevisiForm({
        catatan: "",
        deadline: ""
      });
    }
  });

  const uploadRevisiMutation = useMutation({
    mutationFn: ({ revisiId, file }: { revisiId: string; file: File }) =>
      uploadRevisiSidang(revisiId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisi-sidang"] });
      setUploadingKey("");
    },
    onError: () => {
      setUploadingKey("");
    }
  });

  const reviewMutation = useMutation({
    mutationFn: ({
      revisiId,
      decision,
      catatan
    }: {
      revisiId: string;
      decision: "APPROVE" | "TOLAK";
      catatan?: string;
    }) =>
      reviewRevisiSidang(revisiId, {
        decision,
        catatan
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revisi-sidang"] });
      queryClient.invalidateQueries({ queryKey: ["skripsi-list-for-revisi-final"] });
    }
  });

  const uploadFinalMutation = useMutation({
    mutationFn: ({ skripsiId, file }: { skripsiId: string; file: File }) =>
      uploadFinalSkripsi(skripsiId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skripsi-list-for-revisi-final"] });
      setUploadingKey("");
    },
    onError: () => {
      setUploadingKey("");
    }
  });

  const uploadPengesahanMutation = useMutation({
    mutationFn: ({ skripsiId, file }: { skripsiId: string; file: File }) =>
      uploadLembarPengesahan(skripsiId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skripsi-list-for-revisi-final"] });
      setUploadingKey("");
    },
    onError: () => {
      setUploadingKey("");
    }
  });

  const approveFinalMutation = useMutation({
    mutationFn: () => {
      const catatan = window.prompt("Catatan pengesahan final:", "") || "";
      return approveFinalSkripsi(selectedSkripsiId, catatan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skripsi-list-for-revisi-final"] });
    }
  });

  const rejectFinalMutation = useMutation({
    mutationFn: () => {
      const alasan = window.prompt("Alasan penolakan final:", "");

      if (!alasan) {
        throw new Error("Alasan wajib diisi");
      }

      return rejectFinalSkripsi(selectedSkripsiId, alasan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skripsi-list-for-revisi-final"] });
    }
  });

  const selectedSkripsi = skripsiOptions.find(
    (item) => item.id === selectedSkripsiId
  );

  const revisiRows = revisiQuery.data ?? [];

  function handleCreateRevisi(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createRevisiMutation.mutate();
  }

  function handleUploadRevisi(
    event: ChangeEvent<HTMLInputElement>,
    revisi: RevisiSidangItem
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploadingKey(`revisi-${revisi.id}`);
    uploadRevisiMutation.mutate({
      revisiId: revisi.id,
      file
    });

    event.target.value = "";
  }

  function handleReview(revisi: RevisiSidangItem, decision: "APPROVE" | "TOLAK") {
    const catatan =
      window.prompt(
        decision === "APPROVE"
          ? "Catatan approval revisi:"
          : "Alasan revisi ditolak:",
        ""
      ) || "";

    reviewMutation.mutate({
      revisiId: revisi.id,
      decision,
      catatan
    });
  }

  function handleUploadFinal(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !selectedSkripsiId) return;

    setUploadingKey(`final-${selectedSkripsiId}`);
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
    uploadPengesahanMutation.mutate({
      skripsiId: selectedSkripsiId,
      file
    });

    event.target.value = "";
  }

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Finalisasi</p>
        <h1>Revisi & Finalisasi Skripsi</h1>
        <p className="muted">
          Kelola catatan revisi, upload revisi, upload final skripsi, dan
          pengesahan akhir.
        </p>
      </div>

      <section className="card form-stack">
        <label>
          <span>Pilih Skripsi</span>
          <select
            value={selectedSkripsiId}
            onChange={(event) => setSelectedSkripsiId(event.target.value)}
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
          <div className="mini-grid">
            <span>Status: {selectedSkripsi.status}</span>
            <span>Tahap: {selectedSkripsi.tahap}</span>
            <span>Mahasiswa: {selectedSkripsi.mahasiswa?.name || "-"}</span>
          </div>
        ) : null}
      </section>

      {canCreateRevisi && selectedSkripsiId ? (
        <form className="card form-stack" onSubmit={handleCreateRevisi}>
          <h2>Buat Catatan Revisi</h2>

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
            {createRevisiMutation.isPending ? "Menyimpan..." : "Buat Revisi"}
          </button>

          {createRevisiMutation.isError ? (
            <div className="alert-error">
              Gagal membuat revisi. Pastikan Anda dosen pembimbing/penguji yang
              ter-assign pada skripsi ini.
            </div>
          ) : null}
        </form>
      ) : null}

      <section className="list-card">
        <h2>Daftar Revisi Sidang</h2>

        {revisiQuery.isLoading ? (
          <p>Memuat revisi...</p>
        ) : revisiRows.length === 0 ? (
          <p>Belum ada revisi sidang.</p>
        ) : (
          revisiRows.map((revisi) => (
            <article key={revisi.id} className="academic-card">
              <div className="page-header-row">
                <div>
                  <strong>{revisi.catatan}</strong>
                  <p className="muted">
                    Dibuat oleh: {revisi.dibuatOleh?.name || revisi.dibuatOlehId}
                    {" "}• Deadline: {formatDate(revisi.deadline)}
                  </p>
                  <small>Berkas: {revisi.berkas?.originalName || "-"}</small>
                </div>

                <StatusBadge value={revisi.status} size="sm" />
              </div>

              {isMahasiswa && canUploadBerkas ? (
                <label className="upload-button">
                  {uploadingKey === `revisi-${revisi.id}`
                    ? "Mengupload..."
                    : revisi.berkas
                      ? "Upload Ulang Revisi"
                      : "Upload Revisi PDF"}
                  <input
                    type="file"
                    accept="application/pdf"
                    hidden
                    onChange={(event) => handleUploadRevisi(event, revisi)}
                  />
                </label>
              ) : null}

              {canReviewRevisi && revisi.berkas ? (
                <div className="row-inline">
                  <button
                    className="primary-button"
                    onClick={() => handleReview(revisi, "APPROVE")}
                  >
                    Approve Revisi
                  </button>

                  <button
                    className="secondary-button"
                    onClick={() => handleReview(revisi, "TOLAK")}
                  >
                    Tolak Revisi
                  </button>
                </div>
              ) : null}
            </article>
          ))
        )}

        {uploadRevisiMutation.isError ? (
          <div className="alert-error">
            Upload revisi gagal. Pastikan file PDF dan Anda adalah pemilik
            skripsi.
          </div>
        ) : null}
      </section>

      {selectedSkripsiId ? (
        <section className="card form-stack">
          <h2>Finalisasi Skripsi</h2>

          <div className="mini-grid">
            <span>Status saat ini: {selectedSkripsi?.status || "-"}</span>
            <span>Upload final: MENUNGGU_FINAL / MENUNGGU_PENGESAHAN</span>
            <span>Approve final: Ketua prodi / admin</span>
          </div>

          {isMahasiswa && canUploadBerkas ? (
            <label className="upload-button">
              {uploadingKey === `final-${selectedSkripsiId}`
                ? "Mengupload..."
                : "Upload Final Skripsi PDF"}
              <input
                type="file"
                accept="application/pdf"
                hidden
                onChange={handleUploadFinal}
              />
            </label>
          ) : null}

          {canUploadBerkas && !isMahasiswa ? (
            <label className="upload-button">
              {uploadingKey === `pengesahan-${selectedSkripsiId}`
                ? "Mengupload..."
                : "Upload Lembar Pengesahan PDF"}
              <input
                type="file"
                accept="application/pdf"
                hidden
                onChange={handleUploadPengesahan}
              />
            </label>
          ) : null}

          {canApproveFinal ? (
            <div className="row-inline">
              <button
                className="primary-button"
                onClick={() => approveFinalMutation.mutate()}
                disabled={approveFinalMutation.isPending}
              >
                Approve Final
              </button>

              <button
                className="secondary-button"
                onClick={() => rejectFinalMutation.mutate()}
                disabled={rejectFinalMutation.isPending}
              >
                Reject Final
              </button>
            </div>
          ) : null}

          {uploadFinalMutation.isError ? (
            <div className="alert-error">
              Upload final gagal. Pastikan status skripsi sudah MENUNGGU_FINAL.
            </div>
          ) : null}

          {uploadPengesahanMutation.isError ? (
            <div className="alert-error">
              Upload lembar pengesahan gagal. Pastikan role memiliki izin upload
              berkas.
            </div>
          ) : null}

          {approveFinalMutation.isError || rejectFinalMutation.isError ? (
            <div className="alert-error">
              Approval final gagal. Pastikan berkas final sudah diupload dan
              status skripsi MENUNGGU_PENGESAHAN.
            </div>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}