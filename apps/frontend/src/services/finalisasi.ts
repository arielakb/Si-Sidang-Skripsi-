import { api } from "./api";

export async function uploadFinalSkripsi(skripsiId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(
    `/finalisasi/skripsi/${skripsiId}/upload-final`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );

  return response.data;
}

export async function uploadLembarPengesahan(skripsiId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post(
    `/finalisasi/skripsi/${skripsiId}/upload-pengesahan`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );

  return response.data;
}

export async function approveFinalSkripsi(skripsiId: string, catatan?: string) {
  const response = await api.post(
    `/finalisasi/skripsi/${skripsiId}/approve-final`,
    {
      catatan
    }
  );

  return response.data;
}

export async function rejectFinalSkripsi(skripsiId: string, alasan: string) {
  const response = await api.post(
    `/finalisasi/skripsi/${skripsiId}/reject-final`,
    {
      alasan
    }
  );

  return response.data;
}

export async function deleteFinalBerkasPermanent(berkasId: string) {
  const response = await api.delete(`/finalisasi/berkas/${berkasId}`);
  return response.data;
}

export async function deletePengesahanPermanent(pengesahanId: string) {
  const response = await api.delete(`/finalisasi/pengesahan/${pengesahanId}`);
  return response.data;
}