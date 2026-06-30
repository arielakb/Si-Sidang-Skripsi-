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
    data:
      | NilaiSidangItem[]
      | {
          rows: NilaiSidangItem[];
          summary: NilaiSidangSummary;
        };
    summary?: NilaiSidangSummary;
  }>(`/nilai-sidang/skripsi/${skripsiId}`);

  const payload = response.data.data;

  if (Array.isArray(payload)) {
    return {
      rows: payload,
      summary:
        response.data.summary ?? {
          nilaiAkhir: null,
          nilaiHuruf: null,
          jumlahInput: payload.length,
          totalBobot: payload.reduce(
            (sum, item) => sum + Number(item.bobot || 0),
            0
          )
        }
    };
  }

  return {
    rows: payload?.rows ?? [],
    summary:
      payload?.summary ?? {
        nilaiAkhir: null,
        nilaiHuruf: null,
        jumlahInput: 0,
        totalBobot: 0
      }
  };
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

export async function deleteNilaiSidangPermanent(nilaiId: string) {
  const response = await api.delete(`/nilai-sidang/${nilaiId}`);
  return response.data;
}