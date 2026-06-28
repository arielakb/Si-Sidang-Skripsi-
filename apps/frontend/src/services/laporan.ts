import { api } from "./api";

export type LaporanSummary = {
  cards: Record<string, number>;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
  byTahap: Array<{
    tahap: string;
    count: number;
  }>;
  byPeminatan: Array<{
    peminatanId?: string | null;
    peminatan: string;
    count: number;
  }>;
};

export type LaporanSkripsiRow = {
  no: number;
  npm: string;
  mahasiswa: string;
  email: string;
  judul: string;
  peminatan: string;
  jenisSkripsi: string;
  tahap: string;
  status: string;
  pembimbing: string;
  penguji: string;
  bimbinganValid: number;
  jumlahBerkas: number;
  jumlahRevisi: number;
  nilaiAkhir: string;
  nilaiHuruf: string;
  progress: number;
  jadwalSidang: string;
  ruang: string;
  createdAt: string;
};

export type LaporanFilter = {
  status?: string;
  tahap?: string;
  peminatanId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

export async function getLaporanSummary() {
  const response = await api.get<{
    success: boolean;
    data: LaporanSummary;
  }>("/laporan/summary");

  return response.data.data;
}

export async function getLaporanSkripsi(params: LaporanFilter = {}) {
  const response = await api.get<{
    success: boolean;
    data: LaporanSkripsiRow[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>("/laporan/skripsi", {
    params
  });

  return response.data;
}

export async function downloadLaporanSkripsiExcel(params: LaporanFilter = {}) {
  const response = await api.get("/laporan/skripsi/export.xlsx", {
    params,
    responseType: "blob"
  });

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = url;
  link.download = `laporan-skripsi-${Date.now()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}

export async function downloadLaporanSkripsiPdf(params: LaporanFilter = {}) {
  const response = await api.get("/laporan/skripsi/export.pdf", {
    params,
    responseType: "blob"
  });

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = url;
  link.download = `laporan-skripsi-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}