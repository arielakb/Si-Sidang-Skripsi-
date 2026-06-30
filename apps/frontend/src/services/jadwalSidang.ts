import { api } from "./api";
import type { JadwalSidangItem, JadwalSidangStatus } from "../types/jadwal";

export type GetJadwalSidangParams = {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
};

export type CreateJadwalSidangPayload = {
  skripsiId: string;
  ruangId?: string | null;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  tempatManual?: string | null;
  linkVicon?: string | null;
  pengujiIds?: string[];
};

export async function getJadwalSidang(params: GetJadwalSidangParams = {}) {
  const response = await api.get<{
    success: boolean;
    data: JadwalSidangItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/jadwal-sidang", {
    params
  });

  return response.data;
}

export async function deleteJadwalSidangPermanent(jadwalId: string) {
  const response = await api.delete(`/jadwal-sidang/${jadwalId}`);
  return response.data;
}

export async function createJadwalSidang(payload: CreateJadwalSidangPayload) {
  const response = await api.post("/jadwal-sidang", payload);
  return response.data;
}

export async function updateJadwalSidangStatus(
  jadwalId: string,
  status: JadwalSidangStatus
) {
  const response = await api.patch(`/jadwal-sidang/${jadwalId}/status`, {
    status
  });

  return response.data;
}