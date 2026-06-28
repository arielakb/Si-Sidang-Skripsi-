import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import StatusBadge from "../../components/ui/StatusBadge";
import { getApiErrorMessage } from "../../utils/apiError";
import {
  assignPembimbing,
  getDosenPembimbingOptions,
  getKompreSkripsiList
} from "../../services/seminarProposal";

export default function AssignPembimbingPage() {
  const queryClient = useQueryClient();
  const [selectedDosenMap, setSelectedDosenMap] = useState<Record<string, string>>({});

  const skripsiQuery = useQuery({
    queryKey: ["kompre-skripsi-list"],
    queryFn: getKompreSkripsiList
  });

  const dosenQuery = useQuery({
    queryKey: ["dosen-pembimbing-options"],
    queryFn: getDosenPembimbingOptions
  });

  const assignMutation = useMutation({
    mutationFn: ({
      skripsiId,
      dosenId
    }: {
      skripsiId: string;
      dosenId: string;
    }) =>
      assignPembimbing(skripsiId, {
        dosenId
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["kompre-skripsi-list"]
      });

      alert("Dosen pembimbing berhasil ditetapkan.");
    },
    onError: (error) => {
      alert(getApiErrorMessage(error, "Gagal menetapkan dosen pembimbing."));
    }
  });

  const skripsiRows = skripsiQuery.data ?? [];
  const dosenOptions = dosenQuery.data ?? [];

  function getCurrentPembimbing(item: (typeof skripsiRows)[number]) {
    return item.dosenSkripsi?.find((row) => row.peran === "PEMBIMBING");
  }

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Administrasi</p>
        <h1>Assign Dosen Pembimbing</h1>
        <p className="muted">
          Tetapkan dosen pembimbing untuk mahasiswa yang sudah lulus seminar
          proposal dan masuk tahap KOMPRE.
        </p>
      </div>

      <section className="list-card">
        <h2>Daftar Skripsi Tahap KOMPRE</h2>

        {skripsiQuery.isLoading || dosenQuery.isLoading ? (
          <p>Memuat data...</p>
        ) : skripsiRows.length === 0 ? (
          <p className="muted">Belum ada skripsi pada tahap KOMPRE.</p>
        ) : (
          skripsiRows.map((item) => {
            const currentPembimbing = getCurrentPembimbing(item);
            const selectedDosenId =
              selectedDosenMap[item.id] || currentPembimbing?.dosen.id || "";

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

                <div className="mini-section">
                  <h3>Pembimbing Saat Ini</h3>
                  {currentPembimbing ? (
                    <div className="mini-list-item">
                      <strong>{currentPembimbing.dosen.name}</strong>
                      <span>{currentPembimbing.dosen.identifier || "-"}</span>
                      <small>{currentPembimbing.dosen.email || "-"}</small>
                    </div>
                  ) : (
                    <p className="muted">Belum ada dosen pembimbing.</p>
                  )}
                </div>

                <div className="form-grid">
                  <label>
                    <span>Pilih Dosen Pembimbing</span>
                    <select
                      value={selectedDosenId}
                      onChange={(event) =>
                        setSelectedDosenMap((current) => ({
                          ...current,
                          [item.id]: event.target.value
                        }))
                      }
                    >
                      <option value="">Pilih dosen</option>
                      {dosenOptions.map((dosen) => (
                        <option key={dosen.id} value={dosen.id}>
                          {dosen.name} — {dosen.identifier || dosen.email || "-"}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    className="primary-button"
                    disabled={!selectedDosenId || assignMutation.isPending}
                    onClick={() =>
                      assignMutation.mutate({
                        skripsiId: item.id,
                        dosenId: selectedDosenId
                      })
                    }
                  >
                    Simpan Pembimbing
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