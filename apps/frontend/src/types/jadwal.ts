export type JadwalSidangStatus =
  | "DIJADWALKAN"
  | "BERLANGSUNG"
  | "SELESAI"
  | "DIBATALKAN";

export type RuangOption = {
  id: string;
  code: string;
  name: string;
  type?: string | null;
  capacity?: number | null;
  facilities?: string | null;
};

export type JadwalSidangItem = {
  id: string;
  skripsiId: string;
  ruangId?: string | null;
  dibuatOlehId: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  tempatManual?: string | null;
  linkVicon?: string | null;
  status: JadwalSidangStatus;
  createdAt: string;
  updatedAt: string;
  ruang?: RuangOption | null;
  skripsi: {
    id: string;
    title?: string | null;
    tahap: string;
    status: string;
    mahasiswa: {
      id: string;
      identifier: string;
      name: string;
      email?: string | null;
    };
    peminatan?: {
      id: string;
      slug: string;
      name: string;
    } | null;
    dosenSkripsi?: Array<{
      id: string;
      peran: string;
      dosen: {
        id: string;
        identifier: string;
        name: string;
      };
    }>;
  };
};

export type PeminjamanRuangStatus =
  | "DIAJUKAN"
  | "DISETUJUI"
  | "DITOLAK"
  | "DIBATALKAN";

export type PeminjamanRuangItem = {
  id: string;
  skripsiId?: string | null;
  mahasiswaId: string;
  ruangId: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  keperluan: string;
  status: PeminjamanRuangStatus;
  alasan?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  ruang: RuangOption;
  mahasiswa?: {
    id: string;
    identifier: string;
    name: string;
    email?: string | null;
  };
  skripsi?: {
    id: string;
    title?: string | null;
    tahap: string;
    status: string;
  } | null;
  reviewedBy?: {
    id: string;
    identifier: string;
    name: string;
  } | null;
};