import { api } from "./api";
import type { GradingScale, MasterRuang, Peminatan } from "../types/admin";

export type CreatePeminatanPayload = {
  slug: string;
  name: string;
  description?: string;
};

export type UpdatePeminatanPayload = Partial<CreatePeminatanPayload> & {
  isActive?: boolean;
};

export type CreateRuangPayload = {
  code: string;
  name: string;
  type?: string;
  capacity?: number;
  facilities?: string;
};

export type UpdateRuangPayload = Partial<CreateRuangPayload> & {
  isActive?: boolean;
};

export async function getPeminatan(
  options: { includeInactive?: boolean } = {}
) {
  const response = await api.get<{
    success: boolean;
    data: Peminatan[];
  }>("/master-data/peminatan", {
    params: options.includeInactive
      ? {
          includeInactive: true
        }
      : undefined
  });

  return response.data.data;
}

export async function createPeminatan(payload: CreatePeminatanPayload) {
  const response = await api.post("/master-data/peminatan", payload);
  return response.data;
}

export async function updatePeminatan(
  id: string,
  payload: UpdatePeminatanPayload
) {
  const response = await api.patch(`/master-data/peminatan/${id}`, payload);
  return response.data;
}

export async function deletePeminatanPermanent(id: string) {
  const response = await api.delete(`/master-data/peminatan/${id}`);
  return response.data;
}

export async function getRuang(
  options: { includeInactive?: boolean } = {}
) {
  const response = await api.get<{
    success: boolean;
    data: MasterRuang[];
  }>("/master-data/ruang", {
    params: options.includeInactive
      ? {
          includeInactive: true
        }
      : undefined
  });

  return response.data.data;
}

export async function createRuang(payload: CreateRuangPayload) {
  const response = await api.post("/master-data/ruang", payload);
  return response.data;
}

export async function updateRuang(id: string, payload: UpdateRuangPayload) {
  const response = await api.patch(`/master-data/ruang/${id}`, payload);
  return response.data;
}

export async function deleteRuangPermanent(id: string) {
  const response = await api.delete(`/master-data/ruang/${id}`);
  return response.data;
}

export async function getGradingScales() {
  const response = await api.get<{
    success: boolean;
    data: GradingScale[];
  }>("/master-data/grading-scales");

  return response.data.data;
}