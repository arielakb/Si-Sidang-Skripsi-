import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPeminatan,
  createRuang,
  getGradingScales,
  getPeminatan,
  getRuang,
  updatePeminatan,
  updateRuang
} from "../../services/masterData";

export default function MasterDataPage() {
  const queryClient = useQueryClient();

  const [peminatanForm, setPeminatanForm] = useState({
    slug: "",
    name: "",
    description: ""
  });

  const [ruangForm, setRuangForm] = useState({
    code: "",
    name: "",
    type: "",
    capacity: "",
    facilities: ""
  });

  const peminatanQuery = useQuery({
    queryKey: ["peminatan"],
    queryFn: getPeminatan
  });

  const ruangQuery = useQuery({
    queryKey: ["ruang"],
    queryFn: getRuang
  });

  const gradingQuery = useQuery({
    queryKey: ["grading-scales"],
    queryFn: getGradingScales
  });

  const createPeminatanMutation = useMutation({
    mutationFn: createPeminatan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peminatan"] });
      setPeminatanForm({
        slug: "",
        name: "",
        description: ""
      });
    }
  });

  const createRuangMutation = useMutation({
    mutationFn: createRuang,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ruang"] });
      setRuangForm({
        code: "",
        name: "",
        type: "",
        capacity: "",
        facilities: ""
      });
    }
  });

  const togglePeminatanMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updatePeminatan(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peminatan"] });
    }
  });

  const toggleRuangMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateRuang(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ruang"] });
    }
  });

  function handleCreatePeminatan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createPeminatanMutation.mutate({
      slug: peminatanForm.slug,
      name: peminatanForm.name,
      description: peminatanForm.description || undefined
    });
  }

  function handleCreateRuang(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    createRuangMutation.mutate({
      code: ruangForm.code,
      name: ruangForm.name,
      type: ruangForm.type || undefined,
      capacity: ruangForm.capacity ? Number(ruangForm.capacity) : undefined,
      facilities: ruangForm.facilities || undefined
    });
  }

  return (
    <section className="page-stack">
      <div>
        <p className="eyebrow">Master Data</p>
        <h1>Master Data Sisidang</h1>
        <p className="muted">
          Kelola peminatan, ruang sidang, dan referensi grading.
        </p>
      </div>

      <section className="two-column">
        <form className="card form-stack" onSubmit={handleCreatePeminatan}>
          <h2>Tambah Peminatan</h2>

          <label>
            <span>Slug</span>
            <input
              value={peminatanForm.slug}
              onChange={(event) =>
                setPeminatanForm((current) => ({
                  ...current,
                  slug: event.target.value
                }))
              }
              placeholder="ai"
              required
            />
          </label>

          <label>
            <span>Nama</span>
            <input
              value={peminatanForm.name}
              onChange={(event) =>
                setPeminatanForm((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
              placeholder="Artificial Intelligence"
              required
            />
          </label>

          <label>
            <span>Deskripsi</span>
            <textarea
              value={peminatanForm.description}
              onChange={(event) =>
                setPeminatanForm((current) => ({
                  ...current,
                  description: event.target.value
                }))
              }
              placeholder="Deskripsi peminatan"
            />
          </label>

          <button className="primary-button" type="submit">
            Simpan Peminatan
          </button>
        </form>

        <form className="card form-stack" onSubmit={handleCreateRuang}>
          <h2>Tambah Ruang</h2>

          <label>
            <span>Kode</span>
            <input
              value={ruangForm.code}
              onChange={(event) =>
                setRuangForm((current) => ({
                  ...current,
                  code: event.target.value
                }))
              }
              placeholder="R-102"
              required
            />
          </label>

          <label>
            <span>Nama</span>
            <input
              value={ruangForm.name}
              onChange={(event) =>
                setRuangForm((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
              placeholder="Ruang Sidang 102"
              required
            />
          </label>

          <label>
            <span>Tipe</span>
            <input
              value={ruangForm.type}
              onChange={(event) =>
                setRuangForm((current) => ({
                  ...current,
                  type: event.target.value
                }))
              }
              placeholder="Ruang Sidang"
            />
          </label>

          <label>
            <span>Kapasitas</span>
            <input
              type="number"
              value={ruangForm.capacity}
              onChange={(event) =>
                setRuangForm((current) => ({
                  ...current,
                  capacity: event.target.value
                }))
              }
              placeholder="30"
            />
          </label>

          <label>
            <span>Fasilitas</span>
            <textarea
              value={ruangForm.facilities}
              onChange={(event) =>
                setRuangForm((current) => ({
                  ...current,
                  facilities: event.target.value
                }))
              }
              placeholder="Proyektor, AC, whiteboard"
            />
          </label>

          <button className="primary-button" type="submit">
            Simpan Ruang
          </button>
        </form>
      </section>

      <section className="two-column">
        <div className="list-card">
          <h2>Daftar Peminatan</h2>

          {(peminatanQuery.data ?? []).map((item) => (
            <article key={item.id} className="list-item">
              <div>
                <strong>{item.name}</strong>
                <p className="muted">
                  {item.slug} • {item.description || "-"}
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={() =>
                  togglePeminatanMutation.mutate({
                    id: item.id,
                    isActive: !item.isActive
                  })
                }
              >
                {item.isActive ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </article>
          ))}
        </div>

        <div className="list-card">
          <h2>Daftar Ruang</h2>

          {(ruangQuery.data ?? []).map((item) => (
            <article key={item.id} className="list-item">
              <div>
                <strong>{item.name}</strong>
                <p className="muted">
                  {item.code} • {item.type || "-"} • Kapasitas{" "}
                  {item.capacity || "-"}
                </p>
              </div>

              <button
                className="secondary-button"
                onClick={() =>
                  toggleRuangMutation.mutate({
                    id: item.id,
                    isActive: !item.isActive
                  })
                }
              >
                {item.isActive ? "Nonaktifkan" : "Aktifkan"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <div className="list-card">
        <h2>Grading Scale</h2>

        {(gradingQuery.data ?? []).map((item) => (
          <article key={item.id} className="list-item">
            <div>
              <strong>{item.letter}</strong>
              <p className="muted">
                {item.minScore} - {item.maxScore}
              </p>
            </div>
            <span>{item.isActive ? "Aktif" : "Nonaktif"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}