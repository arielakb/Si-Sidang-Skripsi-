import { api } from "./api";

export async function downloadBerkas(berkasId: string, fileName: string) {
  const response = await api.get(`/berkas/${berkasId}/download`, {
    responseType: "blob"
  });

  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName || "berkas.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}