export type PeminatanOption = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
};

export type JenisSkripsiOption = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
};

export type BerkasItem = {
  id: string;
  kategori: string;
  status: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  sizeBytes: string;
  path: string;
  catatan?: string | null;
  createdAt: string;
};

export type KodeEtikItem = {
  id: string;
  statementVersion: string;
  agreedAt: string;
};

export type DosenSkripsiItem = {
  id: string;
  peran: string;
  isActive: boolean;
  dosen: {
    id: string;
    identifier: string;
    name: string;
    email?: string | null;
  };
};

export type SuratPerjanjianItem = {
  id: string;
  createdAt: string;
  berkas: BerkasItem;
};

export type SkripsiItem = {
  id: string;
  mahasiswaId: string;
  peminatanId?: string | null;
  jenisSkripsiId?: string | null;
  title?: string | null;
  abstract?: string | null;
  tahap: string;
  status: string;
  seminarApprovedAt?: string | null;
  selesaiAt?: string | null;
  createdAt: string;
  updatedAt: string;
  peminatan?: PeminatanOption | null;
  jenisSkripsi?: JenisSkripsiOption | null;
  berkas: BerkasItem[];
  kodeEtik: KodeEtikItem[];
  dosenSkripsi: DosenSkripsiItem[];
  suratPerjanjian: SuratPerjanjianItem[];
};