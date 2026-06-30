import { api } from "./api";
import type { UserItem } from "../types/admin";

export type CreateUserPayload = {
  identifier: string;
  name: string;
  email?: string;
  password: string;
  roleSlugs: string[];
};

export type UpdateUserStatusPayload = {
  status: "ACTIVE" | "INACTIVE";
};

export type AssignRolesPayload = {
  roleSlugs: string[];
};

export async function getUsers() {
  const response = await api.get<{
    success: boolean;
    data: UserItem[];
  }>("/users");

  return response.data.data;
}

export async function createUser(payload: CreateUserPayload) {
  const response = await api.post("/users", payload);
  return response.data;
}

export async function updateUserStatus(
  userId: string,
  payload: UpdateUserStatusPayload
) {
  const response = await api.patch(`/users/${userId}/status`, payload);
  return response.data;
}

export async function assignUserRoles(
  userId: string,
  payload: AssignRolesPayload
) {
  const response = await api.post(`/users/${userId}/roles`, payload);
  return response.data;
}

export async function deleteUserPermanent(userId: string) {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
}