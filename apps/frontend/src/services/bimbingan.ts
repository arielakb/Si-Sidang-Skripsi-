import { api } from "./api";
import type {
  BimbinganLog,
  CompleteBimbinganPayload,
  ConfirmBimbinganPayload,
  RejectBimbinganPayload,
  RequestBimbinganPayload,
  ValidateBimbinganPayload
} from "../types/bimbingan";

export async function getBimbinganBySkripsi(skripsiId: string) {
  const response = await api.get<{
    success: boolean;
    data: BimbinganLog[];
    meta: {
      validCount: number;
      requiredCount: number;
      canRequestSidang: boolean;
    };
  }>(`/bimbingan/skripsi/${skripsiId}`);

  return response.data;
}

export async function requestBimbingan(
  skripsiId: string,
  payload: RequestBimbinganPayload
) {
  const response = await api.post(
    `/bimbingan/skripsi/${skripsiId}/request`,
    payload
  );

  return response.data;
}

export async function confirmBimbingan(
  bimbinganId: string,
  payload: ConfirmBimbinganPayload
) {
  const response = await api.patch(
    `/bimbingan/${bimbinganId}/confirm`,
    payload
  );

  return response.data;
}

export async function rejectBimbingan(
  bimbinganId: string,
  payload: RejectBimbinganPayload
) {
  const response = await api.patch(
    `/bimbingan/${bimbinganId}/reject`,
    payload
  );

  return response.data;
}

export async function completeBimbingan(
  bimbinganId: string,
  payload: CompleteBimbinganPayload
) {
  const response = await api.patch(
    `/bimbingan/${bimbinganId}/complete`,
    payload
  );

  return response.data;
}

export async function validateBimbingan(
  bimbinganId: string,
  payload?: ValidateBimbinganPayload
) {
  const response = await api.patch(
    `/bimbingan/${bimbinganId}/validate`,
    payload ?? {}
  );

  return response.data;
}