import { api } from "./api";
import type { ApiResponse, JenisSkripsi, PublicJadwalSidang } from "../types/api";

export type PublicScheduleParams = {
  search?: string;
  jenisSkripsi?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export async function getPublicSchedules(params: PublicScheduleParams) {
  const response = await api.get<ApiResponse<PublicJadwalSidang[]>>(
    "/public/jadwal-sidang",
    { params }
  );

  return response.data;
}

export async function getPublicScheduleDetail(id: string) {
  const response = await api.get<ApiResponse<PublicJadwalSidang>>(
    `/public/jadwal-sidang/${id}`
  );

  return response.data;
}

export async function getPublicJenisSkripsi() {
  const response = await api.get<ApiResponse<JenisSkripsi[]>>(
    "/public/jenis-skripsi"
  );

  return response.data;
}