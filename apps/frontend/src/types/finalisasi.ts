export type NilaiSidangItem = {
  id: string;
  skripsiId: string;
  dosenId: string;
  komponen: string;
  nilai: string;
  bobot: string;
  catatan?: string | null;
  createdAt: string;
  updatedAt: string;
  dosen?: {
    id: string;
    identifier: string;
    name: string;
  };
};

export type NilaiSidangSummary = {
  nilaiAkhir: number;
  nilaiHuruf?: string | null;
  totalBobot: number;
};

export type RevisiSidangItem = {
  id: string;
  skripsiId: string;
  dibuatOlehId: string;
  berkasId?: string | null;
  catatan: string;
  status: string;
  deadline?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  dibuatOleh?: {
    id: string;
    identifier: string;
    name: string;
  };
  approvedBy?: {
    id: string;
    identifier: string;
    name: string;
  } | null;
  berkas?: {
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
  } | null;
};