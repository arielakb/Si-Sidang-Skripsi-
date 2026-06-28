import { api } from "./api";

export type AuditLogItem = {
  id: string;
  userId?: string | null;
  method: string;
  path: string;
  action?: string | null;
  statusCode?: number | null;
  ip?: string | null;
  userAgent?: string | null;
  requestBody?: unknown;
  params?: unknown;
  query?: unknown;
  createdAt: string;
  user?: {
    id: string;
    identifier: string;
    name: string;
    email?: string | null;
  } | null;
};

export async function getAuditLogs(params: {
  page?: number;
  limit?: number;
  method?: string;
  search?: string;
} = {}) {
  const response = await api.get<{
    success: boolean;
    data: AuditLogItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/audit-logs", {
    params
  });

  return response.data;
}