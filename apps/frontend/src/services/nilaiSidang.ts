import { api } from "./api";
import type { NilaiSidangItem, NilaiSidangSummary } from "../types/finalisasi";

export type InputNilaiSidangPayload = {
  komponen: string;
  nilai: number;
  bobot: number;
  catatan?: string;
};

export async function getNilaiSidang(skripsiId: string) {
  const response = await api.get<{
    success: boolean;
    data: {
      rows: NilaiSidangItem[];
      summary: NilaiSidangSummary;
    };
  }>(`/nilai-sidang/skripsi/${skripsiId}`);

  return response.data.data;
}

export async function inputNilaiSidang(
  skripsiId: string,
  payload: InputNilaiSidangPayload
) {
  const response = await api.post(`/nilai-sidang/skripsi/${skripsiId}`, payload);
  return response.data;
}

export async function finalizeNilaiSidang(skripsiId: string) {
  const response = await api.post(
    `/nilai-sidang/skripsi/${skripsiId}/finalize`
  );

  return response.data;
}