export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type JenisSkripsi = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
};

export type PublicDosenSkripsi = {
  peran: "PEMBIMBING" | "PENGUJI" | "KOORDINATOR";
  dosen: {
    id: string;
    identifier: string;
    name: string;
  };
};

export type PublicJadwalSidang = {
  id: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  tempatManual?: string | null;
  linkVicon?: string | null;
  status: string;
  ruang?: {
    id: string;
    code: string;
    name: string;
  } | null;
  skripsi: {
    id: string;
    title?: string | null;
    mahasiswa: {
      id: string;
      identifier: string;
      name: string;
    };
    jenisSkripsi?: JenisSkripsi | null;
    peminatan?: {
      id: string;
      slug: string;
      name: string;
    } | null;
    dosenSkripsi: PublicDosenSkripsi[];
  };
};