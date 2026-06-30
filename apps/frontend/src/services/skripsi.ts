import { api } from "./api";
import type { SkripsiSummary } from "../types/skripsi";

export async function getMySkripsi() {
  const response = await api.get<{
    success: boolean;
    data: SkripsiSummary[];
  }>("/skripsi/my");

  return response.data.data;
}

export async function getSkripsiDetail(id: string) {
  const response = await api.get<{
    success: boolean;
    data: SkripsiSummary;
  }>(`/skripsi/${id}`);

  return response.data.data;
}

export async function getBimbinganCounter(skripsiId: string) {
  const response = await api.get<{
    success: boolean;
    data: {
      validCount: number;
      requiredCount: number;
      canRequestSidang: boolean;
    };
  }>(`/skripsi/${skripsiId}/bimbingan-counter`);

  return response.data.data;
}

export type GetSkripsiListParams = {
  status?: string;
  tahap?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type UpdateSkripsiStatusPayload = {
  status:
    | "MENUNGGU_BERKAS"
    | "MENUNGGU_APPROVAL"
    | "MENUNGGU_REVISI"
    | "MENUNGGU_JADWAL"
    | "SIAP_SIDANG"
    | "DIJADWALKAN"
    | "BERLANGSUNG"
    | "EVALUASI_SIDANG"
    | "MENUNGGU_FINAL"
    | "MENUNGGU_PENGESAHAN"
    | "SELESAI"
    | "DITOLAK"
    | "DIBATALKAN"
    | "DIARSIPKAN"
    | "NONAKTIF";
};

export async function getSkripsiList(params: GetSkripsiListParams = {}) {
  const response = await api.get<{
    success: boolean;
    data: SkripsiSummary[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/skripsi", {
    params
  });

  return response.data;
}

export async function updateSkripsiStatus(
  skripsiId: string,
  payload: UpdateSkripsiStatusPayload
) {
  const response = await api.patch(`/skripsi/${skripsiId}/status`, payload);
  return response.data;
}

export async function deleteSkripsiPermanent(skripsiId: string) {
  const response = await api.delete(`/skripsi/${skripsiId}`);
  return response.data;
}

export async function approveMajuSidang(
  skripsiId: string,
  payload: {
    catatan?: string;
  } = {}
) {
  const response = await api.post<{
    success: boolean;
    message: string;
    data?: unknown;
  }>(`/skripsi/${skripsiId}/approve-maju-sidang`, payload);

  return response.data;
}

export async function assignPembimbing(
  skripsiId: string,
  payload: {
    dosenIds: string[];
  }
) {
  const response = await api.post<{
    success: boolean;
    message: string;
    data?: unknown;
  }>(`/skripsi/${skripsiId}/assign-pembimbing`, payload);

  return response.data;
}