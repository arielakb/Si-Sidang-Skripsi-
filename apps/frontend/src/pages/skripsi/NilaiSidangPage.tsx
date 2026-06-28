import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthContext";
import {
  finalizeNilaiSidang,
  getNilaiSidang,
  inputNilaiSidang
} from "../../services/nilaiSidang";
import { getSkripsiList } from "../../services/skripsi";
import type { SkripsiSummary } from "../../types/skripsi";

export default function NilaiSidangPage() {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const canInput = hasPermission("nilai.input");

  const [selectedSkripsiId, setSelectedSkripsiId] = useState("");
  const [form, setForm] = useState({
    komponen: "presentasi",
    nilai: "85",
    bobot: "40",
    catatan: ""
  });

  const skripsiQuery = useQuery({
    queryKey: ["skripsi-list-for-nilai"],
    queryFn: () =>
      getSkripsiList({
        limit: 100
      })
  });

  const skripsiOptions: SkripsiSummary[] = useMemo(() => {
    const rows = skripsiQuery.data?.data ?? [];

    return rows.filter((item) =>
      [
        "SIAP_SIDANG",
        "EVALUASI_SIDANG",
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

  const nilaiQuery = useQuery({
    queryKey: ["nilai-sidang", selectedSkripsiId],
    queryFn: () => getNilaiSidang(selectedSkripsiId),
    enabled: Boolean(selectedSkripsiId)
  });

  const inputMutation = useMutation({
    mutationFn: () =>
      inputNilaiSidang(selectedSkripsiId, {
        komponen: form.komponen,
        nilai: Number(form.nilai),
        bobot: Number(form.bobot),
        catatan: form.catatan || undefined
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nilai-sidang"] });
      setForm({
        komponen: "presentasi",
        nilai: "85",
        bobot: "40",
        catatan: ""
      });
    }
  });

  const finalizeMutation = useMutation({
    mutationFn: () => finalizeNilaiSidang(selectedSkripsiId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["nilai-sidang"] });
      queryClient.invalidateQueries({ queryKey: ["skripsi-list-for-nilai"] });
    }
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    inputMutation.mutate();
  }

  const selectedSkripsi = skripsiOptions.find(
    (item) => item.id === selectedSkripsiId
  );

  const rows = nilaiQuery.data?.rows ?? [];
  const summary = nilaiQuery.data?.summary;

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Sidang</p>
        <h1>Nilai Sidang</h1>
        <p className="muted">
          Input komponen nilai sidang, bobot nilai, dan finalize nilai akhir.
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
              <option value="">Belum ada skripsi siap dinilai</option>
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

      {canInput && selectedSkripsiId ? (
        <form className="card form-stack" onSubmit={handleSubmit}>
          <h2>Input Nilai</h2>

          <section className="two-column compact">
            <label>
              <span>Komponen</span>
              <select
                value={form.komponen}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    komponen: event.target.value
                  }))
                }
              >
                <option value="presentasi">Presentasi</option>
                <option value="substansi">Substansi</option>
                <option value="metodologi">Metodologi</option>
                <option value="tanya_jawab">Tanya Jawab</option>
                <option value="naskah">Naskah</option>
              </select>
            </label>

            <label>
              <span>Nilai</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.nilai}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    nilai: event.target.value
                  }))
                }
                required
              />
            </label>
          </section>

          <label>
            <span>Bobot</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={form.bobot}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  bobot: event.target.value
                }))
              }
              required
            />
          </label>

          <label>
            <span>Catatan</span>
            <textarea
              value={form.catatan}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  catatan: event.target.value
                }))
              }
              placeholder="Catatan penilaian"
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={inputMutation.isPending}
          >
            {inputMutation.isPending ? "Menyimpan..." : "Simpan Nilai"}
          </button>

          {inputMutation.isError ? (
            <div className="alert-error">
              Gagal menyimpan nilai. Pastikan Anda dosen pembimbing/penguji yang
              ter-assign pada skripsi ini.
            </div>
          ) : null}
        </form>
      ) : null}

      <section className="list-card">
        <div className="page-header-row">
          <div>
            <h2>Rekap Nilai</h2>
            <p className="muted">
              Nilai akhir: <strong>{summary?.nilaiAkhir ?? 0}</strong> • Huruf:{" "}
              <strong>{summary?.nilaiHuruf || "-"}</strong> • Bobot:{" "}
              <strong>{summary?.totalBobot ?? 0}</strong>
            </p>
          </div>

          {canInput && selectedSkripsiId ? (
            <button
              className="primary-button"
              onClick={() => finalizeMutation.mutate()}
              disabled={finalizeMutation.isPending || rows.length === 0}
            >
              {finalizeMutation.isPending ? "Finalizing..." : "Finalize Nilai"}
            </button>
          ) : null}
        </div>

        {nilaiQuery.isLoading ? (
          <p>Memuat nilai...</p>
        ) : rows.length === 0 ? (
          <p>Belum ada nilai.</p>
        ) : (
          rows.map((item) => (
            <article key={item.id} className="list-item">
              <div>
                <strong>{item.komponen}</strong>
                <p className="muted">
                  Dosen: {item.dosen?.name || item.dosenId} • Catatan:{" "}
                  {item.catatan || "-"}
                </p>
              </div>

              <div className="score-box">
                <strong>{item.nilai}</strong>
                <small>Bobot {item.bobot}</small>
              </div>
            </article>
          ))
        )}

        {finalizeMutation.isError ? (
          <div className="alert-error">
            Gagal finalize nilai. Pastikan minimal satu nilai sudah diinput.
          </div>
        ) : null}
      </section>
    </section>
  );
}