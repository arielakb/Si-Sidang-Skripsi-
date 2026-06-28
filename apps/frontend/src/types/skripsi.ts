import type { BimbinganLog } from "./bimbingan";

export type SkripsiDosenAssignment = {
  id: string;
  peran: "PEMBIMBING" | "PENGUJI" | "KOORDINATOR";
  isActive: boolean;
  dosen: {
    id: string;
    identifier: string;
    name: string;
    email?: string | null;
  };
};

export type SkripsiSummary = {
  id: string;
  mahasiswaId: string;
  title?: string | null;
  abstract?: string | null;
  tahap: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  dosenSkripsi: SkripsiDosenAssignment[];
  bimbinganLogs?: BimbinganLog[];
  mahasiswa?: {
    id: string;
    identifier: string;
    name: string;
  };
};