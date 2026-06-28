export type BimbinganStatus =
  | "DIAJUKAN"
  | "DISETUJUI"
  | "DITOLAK"
  | "SELESAI"
  | "DIVALIDASI"
  | "DIBATALKAN";

export type BimbinganLog = {
  id: string;
  skripsiId: string;
  mahasiswaId: string;
  dosenId: string;
  tanggalPengajuan: string;
  jadwalMulai?: string | null;
  jadwalSelesai?: string | null;
  topik: string;
  hasil?: string | null;
  status: BimbinganStatus;
  catatanDosen?: string | null;
  catatanMahasiswa?: string | null;
  validatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  mahasiswa?: {
    id: string;
    identifier: string;
    name: string;
  };
  dosen?: {
    id: string;
    identifier: string;
    name: string;
  };
};

export type BimbinganCounter = {
  skripsiId: string;
  validCount: number;
  requiredCount: number;
  percentage: number;
  canRequestSidang: boolean;
};

export type RequestBimbinganPayload = {
  dosenId: string;
  jadwalMulai: string;
  jadwalSelesai: string;
  topik: string;
};

export type ConfirmBimbinganPayload = {
  jadwalMulai?: string;
  jadwalSelesai?: string;
  catatanDosen?: string;
};

export type CompleteBimbinganPayload = {
  hasil: string;
  catatanDosen?: string;
};

export type ValidateBimbinganPayload = {
  catatanMahasiswa?: string;
};

export type RejectBimbinganPayload = {
  catatanDosen?: string;
};