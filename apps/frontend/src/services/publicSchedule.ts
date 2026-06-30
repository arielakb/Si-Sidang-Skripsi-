import { api } from "./api";

export type PublicSidangJenis =
  | "SEMINAR_PROPOSAL"
  | "SEMINAR_HASIL"
  | "SIDANG_KOMPRE"
  | "SIDANG_AKHIR";

export type PublicJadwalStatus = "DIJADWALKAN" | "BERLANGSUNG" | "SELESAI";

export type PublicUser = {
  id?: string;
  identifier?: string | null;
  name?: string | null;
};

export type PublicRuang = {
  id: string;
  code?: string | null;
  name?: string | null;
  type?: string | null;
  capacity?: number | null;
  facilities?: string | null;
};

export type PublicJadwalSidang = {
  id: string;
  sidangId?: string | null;
  skripsiId?: string | null;
  status?: PublicJadwalStatus | string | null;
  tanggal?: string | null;
  waktuMulai?: string | null;
  waktuSelesai?: string | null;
  tempatManual?: string | null;
  linkVicon?: string | null;
  jenisSidang?: PublicSidangJenis | string | null;
  jenisSidangLabel?: string | null;
  sidangStatus?: string | null;
  sidangHasil?: string | null;
  statusPublik?: string | null;
  ruangLabel?: string | null;
  detailUrl?: string | null;
  ruang?: PublicRuang | null;
  sidang?: {
    id: string;
    jenis?: PublicSidangJenis | string | null;
    status?: string | null;
    hasil?: string | null;
    attemptNo?: number | null;
    dosen?: Array<{
      id?: string;
      peran?: string | null;
      dosen?: PublicUser | null;
    }>;
  } | null;
  skripsi?: {
    id?: string;
    title?: string | null;
    mahasiswa?: PublicUser | null;
    peminatan?: {
      id?: string;
      name?: string | null;
      code?: string | null;
      slug?: string | null;
    } | null;
    jenisSkripsi?: {
      id?: string;
      name?: string | null;
      slug?: string | null;
    } | null;
    dosenSkripsi?: Array<{
      id?: string;
      peran?: string | null;
      dosen?: PublicUser | null;
    }>;
  } | null;
};

export type PublicScheduleParams = {
  search?: string;
  jenisSkripsi?: string;
  jenisSidang?: string;
  status?: string;
  tanggal?: string;
  ruangId?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type PublicListResponse<T> = {
  success: boolean;
  data: T[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type PublicDetailResponse<T> = {
  success: boolean;
  data: T;
};

export async function getPublicSchedules(params: PublicScheduleParams = {}) {
  const response = await api.get<PublicListResponse<PublicJadwalSidang>>(
    "/public/jadwal-sidang",
    { params }
  );

  return response.data;
}

export async function getPublicScheduleDetail(id: string) {
  const response = await api.get<PublicDetailResponse<PublicJadwalSidang>>(
    `/public/jadwal-sidang/${id}`
  );

  return response.data.data;
}

export async function getPublicRooms() {
  const response = await api.get<PublicListResponse<PublicRuang>>(
    "/public/ruang"
  );

  return response.data.data ?? [];
}
