import { api } from "./api";
import type { PeminjamanRuangItem } from "../types/jadwal";

export type CreatePeminjamanRuangPayload = {
  skripsiId?: string | null;
  ruangId: string;
  tanggal: string;
  waktuMulai: string;
  waktuSelesai: string;
  keperluan: string;
};

export async function getPeminjamanRuang(params: {
  status?: string;
  page?: number;
  limit?: number;
} = {}) {
  const response = await api.get<{
    success: boolean;
    data: PeminjamanRuangItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/peminjaman-ruang", {
    params
  });

  return response.data;
}

export async function getMyPeminjamanRuang() {
  const response = await api.get<{
    success: boolean;
    data: PeminjamanRuangItem[];
  }>("/peminjaman-ruang/my");

  return response.data.data;
}

export async function createPeminjamanRuang(
  payload: CreatePeminjamanRuangPayload
) {
  const response = await api.post("/peminjaman-ruang", payload);
  return response.data;
}

export async function approvePeminjamanRuang(id: string) {
  const response = await api.patch(`/peminjaman-ruang/${id}/approve`);
  return response.data;
}

export async function rejectPeminjamanRuang(id: string, alasan: string) {
  const response = await api.patch(`/peminjaman-ruang/${id}/reject`, {
    alasan
  });
  return response.data;
}

export async function updatePeminjamanRuangStatus(
  id: string,
  payload: {
    status: "DIAJUKAN" | "DISETUJUI" | "DITOLAK" | "DIBATALKAN";
    alasan?: string;
  }
) {
  const response = await api.patch(`/peminjaman-ruang/${id}/status`, payload);
  return response.data;
}

export async function deletePeminjamanRuangPermanent(id: string) {
  const response = await api.delete(`/peminjaman-ruang/${id}`);
  return response.data;
}