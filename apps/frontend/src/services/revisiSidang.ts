import { api } from "./api";
import type { RevisiSidangItem } from "../types/finalisasi";

export type CreateRevisiSidangPayload = {
  catatan: string;
  deadline?: string | null;
};

export type ReviewRevisiSidangPayload = {
  decision: "APPROVE" | "TOLAK";
  catatan?: string;
};

export async function getRevisiSidangBySkripsi(skripsiId: string) {
  const response = await api.get<{
    success: boolean;
    data: RevisiSidangItem[];
  }>(`/revisi-sidang/skripsi/${skripsiId}`);

  return response.data.data;
}

export async function createRevisiSidang(
  skripsiId: string,
  payload: CreateRevisiSidangPayload
) {
  const response = await api.post(`/revisi-sidang/skripsi/${skripsiId}`, payload);
  return response.data;
}

export async function uploadRevisiSidang(revisiId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(`/revisi-sidang/${revisiId}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
}

export async function reviewRevisiSidang(
  revisiId: string,
  payload: ReviewRevisiSidangPayload
) {
  const response = await api.patch(`/revisi-sidang/${revisiId}/review`, payload);
  return response.data;
}

export async function deleteRevisiSidangPermanent(revisiId: string) {
  const response = await api.delete(`/revisi-sidang/${revisiId}`);
  return response.data;
}