import { api } from "./api";
import type { SkripsiItem } from "../types/academic";

export type RegisterSeminarProposalPayload = {
  title: string;
  abstract?: string;
  peminatanId: string;
};

export type AgreeKodeEtikPayload = {
  statementVersion: string;
};

export async function getMySeminarProposals() {
  const response = await api.get<{
    success: boolean;
    data: SkripsiItem[];
  }>("/seminar-proposal/my");

  return response.data.data;
}

export async function registerSeminarProposal(
  payload: RegisterSeminarProposalPayload
) {
  const response = await api.post<{
    success: boolean;
    message: string;
    data: SkripsiItem;
  }>("/seminar-proposal/register", payload);

  return response.data;
}

export async function uploadProposalFile(skripsiId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(
    `/seminar-proposal/${skripsiId}/upload-proposal`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );

  return response.data;
}

export async function uploadPresentationFile(skripsiId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(
    `/seminar-proposal/${skripsiId}/upload-presentasi`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );

  return response.data;
}

export async function agreeKodeEtik(
  skripsiId: string,
  payload: AgreeKodeEtikPayload
) {
  const response = await api.post(
    `/seminar-proposal/${skripsiId}/kode-etik`,
    payload
  );

  return response.data;
}

export type SeminarBerkasKategori = "PROPOSAL" | "PRESENTASI";

export async function deleteSeminarBerkas(
  skripsiId: string,
  kategori: SeminarBerkasKategori
) {
  const response = await api.delete<{
    success: boolean;
    message: string;
  }>(`/seminar-proposal/${skripsiId}/berkas/${kategori}`);

  return response.data;
}

export type ReviewSeminarDecision = "APPROVE" | "REVISI" | "TOLAK";

export async function getSeminarProposalList(params: {
  status?: string;
  search?: string;
} = {}) {
  const response = await api.get<{
    success: boolean;
    data: unknown[];
  }>("/seminar-proposal", {
    params
  });

  return response.data.data;
}

export async function reviewSeminarProposal(
  skripsiId: string,
  payload: {
    decision: ReviewSeminarDecision;
    catatan?: string;
  }
) {
  const response = await api.patch<{
    success: boolean;
    message: string;
  }>(`/seminar-proposal/${skripsiId}/review`, payload);

  return response.data;
}

export type DosenOption = {
  id: string;
  identifier?: string | null;
  name: string;
  email?: string | null;
};

export type KompreSkripsiItem = {
  id: string;
  title?: string | null;
  abstract?: string | null;
  tahap?: string | null;
  status?: string | null;
  mahasiswa?: {
    id: string;
    identifier?: string | null;
    name?: string | null;
    email?: string | null;
  } | null;
  peminatan?: {
    id: string;
    name: string;
  } | null;
  dosenSkripsi?: {
    id: string;
    peran: string;
    dosen: DosenOption;
  }[];
};

export async function getKompreSkripsiList() {
  const response = await api.get<{
    success: boolean;
    data: KompreSkripsiItem[];
  }>("/seminar-proposal/kompre");

  return response.data.data;
}

export async function getDosenPembimbingOptions() {
  const response = await api.get<{
    success: boolean;
    data: DosenOption[];
  }>("/seminar-proposal/dosen-pembimbing-options");

  return response.data.data;
}

export async function assignPembimbing(
  skripsiId: string,
  payload: {
    dosenId: string;
  }
) {
  const response = await api.patch<{
    success: boolean;
    message: string;
  }>(`/seminar-proposal/${skripsiId}/assign-pembimbing`, payload);

  return response.data;
}