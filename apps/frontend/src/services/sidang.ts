import { api } from "./api";

export type SidangJenis =
  | "SEMINAR_PROPOSAL"
  | "SEMINAR_HASIL"
  | "SIDANG_KOMPRE"
  | "SIDANG_AKHIR";

export type SidangStatus =
  | "DRAFT"
  | "MENUNGGU_BERKAS"
  | "MENUNGGU_PENGUJI"
  | "MENUNGGU_JADWAL"
  | "DIJADWALKAN"
  | "BERLANGSUNG"
  | "MENUNGGU_NILAI"
  | "MENUNGGU_KEPUTUSAN"
  | "SELESAI"
  | "DIBATALKAN";

export type SidangHasil =
  | "LOLOS"
  | "TIDAK_LOLOS"
  | "REVISI"
  | "ULANG"
  | "LULUS"
  | "TIDAK_LULUS";

export type InputHasilSidangPayload = {
  hasil: SidangHasil;
  catatanHasil?: string;
};

export type InputNilaiSidangPayload = {
  nilai: number | string;
  bobot?: number | string;
  komponen?: string;
  catatan?: string;
};

export type DosenOption = {
  id: string;
  identifier: string;
  name: string;
  email?: string | null;
  userRoles?: Array<{
    role: {
      slug: string;
      name?: string | null;
    };
  }>;
};

export type SidangItem = {
  decidedAt: string | null | undefined;
  id: string;
  skripsiId: string;
  jenis: SidangJenis;
  attemptNo: number;
  status: SidangStatus;
  hasil?: SidangHasil | null;
  catatanHasil?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  skripsi?: {
    id: string;
    title?: string | null;
    status?: string | null;
    tahap?: string | null;
    mahasiswa?: {
      id: string;
      identifier?: string | null;
      name?: string | null;
      email?: string | null;
    } | null;
    peminatan?: {
      name?: string | null;
    } | null;
  } | null;
  dosen?: Array<{
    id: string;
    sidangId: string;
    dosenId: string;
    peran: string;
    isActive: boolean;
    dosen: DosenOption;
  }>;
  jadwalSidang?: Array<{
    id: string;
    tanggal?: string | null;
    waktuMulai?: string | null;
    waktuSelesai?: string | null;
    status?: string | null;
    ruang?: {
      code?: string | null;
      name?: string | null;
    } | null;
  }>;
  nilaiSidang?: Array<{
    id: string;
    sidangId?: string | null;
    skripsiId?: string | null;
    dosenId?: string | null;
    komponen?: string | null;
    nilai?: number | string | null;
    bobot?: number | string | null;
    catatan?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
    dosen?: DosenOption | null;
  }>;
  berkas?: Array<{
    id: string;
    kategori: string;
    status: string;
    originalName?: string | null;
    fileName?: string | null;
    mimeType?: string | null;
    createdAt?: string | null;
    uploadedById?: string | null;
  }>;
};

export type GetSidangListParams = {
  jenis?: SidangJenis;
  status?: SidangStatus;
  search?: string;
  page?: number;
  limit?: number;
};

export type CreateJadwalSidangWorkflowPayload = {
  ruangId?: string | null;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  tempatManual?: string | null;
  linkVicon?: string | null;
}

export async function getSidangList(params: GetSidangListParams = {}) {
  const response = await api.get<{
    success: boolean;
    data: SidangItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/sidang", {
    params
  });

  return response.data;
}

export async function getSidangBySkripsi(skripsiId: string) {
  const response = await api.get<{
    success: boolean;
    data: SidangItem[];
  }>(`/sidang/skripsi/${skripsiId}`);

  return response.data.data;
}

export async function getDosenPengujiOptions() {
  const response = await api.get<{
    success: boolean;
    data: DosenOption[];
  }>("/sidang/dosen-penguji-options");

  return response.data.data;
}

export async function assignPengujiSidang(
  sidangId: string,
  payload: {
    dosenIds: string[];
  }
) {
  const response = await api.post(`/sidang/${sidangId}/assign-penguji`, payload);
  return response.data;
}

export async function createJadwalSidangWorkflow(
  sidangId: string,
  payload: CreateJadwalSidangWorkflowPayload
) {
  const response = await api.post(`/sidang/${sidangId}/jadwal`, payload);
  return response.data;
}

export async function inputHasilSidang(
  sidangId: string,
  payload: InputHasilSidangPayload
) {
  const response = await api.post(`/sidang/${sidangId}/hasil`, payload);
  return response.data;
}

export async function inputNilaiSidang(
  sidangId: string,
  payload: InputNilaiSidangPayload
) {
  const response = await api.post(`/sidang/${sidangId}/nilai`, payload);
  return response.data;
}

export async function uploadSuratPerjanjianSidang(
  sidangId: string,
  file: File
) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(
    `/sidang/${sidangId}/upload-surat-perjanjian`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );

  return response.data;
}

export async function registerSeminarProposalAttempt(skripsiId: string) {
  const response = await api.post("/sidang/seminar-proposal/register", {
    skripsiId
  });

  return response.data;
}

export async function uploadBerkasSidang(
  sidangId: string,
  kategori:
    | "PROPOSAL"
    | "PRESENTASI"
    | "SIDANG_SOFTCOPY"
    | "SIDANG_PRESENTASI"
    | "FINAL_SKRIPSI",
  file: File
) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(
    `/sidang/${sidangId}/berkas/${kategori}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );

  return response.data;
}