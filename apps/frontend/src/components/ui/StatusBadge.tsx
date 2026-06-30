type StatusBadgeProps = {
  value?: string | null;
  size?: "sm" | "md";
};

const successStatuses = [
  "ACTIVE",
  "AKTIF",
  "DISETUJUI",
  "APPROVED",
  "APPROVE",
  "APPROVE_REVISI",
  "SELESAI",
  "SUCCESS",
  "DIBACA",
  "DIPEROLEH",
  "TERINPUT",
  "LENGKAP",
  "SIAP",
  "SIAP_MAJU_SIDANG",
  "VALID",
  "DIJADWALKAN",
  "BERLANGSUNG",
  "SUDAH_DISETUJUI",
  "SETUJU",
  "LOLOS",
  "LULUS",
  "LULUS_SKRIPSI"
];

const warningStatuses = [
  "MENUNGGU_BERKAS",
  "MENUNGGU_APPROVAL",
  "MENUNGGU_JADWAL",
  "MENUNGGU_REVISI",
  "MENUNGGU_FINAL",
  "MENUNGGU_PENGESAHAN",
  "MENUNGGU_PENGUJI",
  "MENUNGGU_NILAI",
  "MENUNGGU_KEPUTUSAN",
  "MENUNGGU_PEMBIMBING",
  "MENUNGGU_SEMINAR_HASIL",
  "MENUNGGU_KOMPRE",
  "MENUNGGU_SIDANG_AKHIR",
  "DIAJUKAN",
  "DISETUJUI_DOSEN",
  "EVALUASI_SIDANG",
  "BELUM_UPLOAD",
  "BELUM_SETUJU",
  "BELUM_DIBACA",
  "BELUM_SIAP",
  "BELUM_LENGKAP",
  "ADA_DEADLINE",
  "TANPA_DEADLINE",
  "BERJALAN",
  "HAMPIR_SELESAI",
  "POST",
  "PATCH",
  "PUT",
  "BELUM_DISETUJUI",
  "REVISI",
  "ULANG"
];

const dangerStatuses = [
  "INACTIVE",
  "NONAKTIF",
  "DITOLAK",
  "TOLAK",
  "REJECTED",
  "DIBATALKAN",
  "DELETE",
  "CLIENT_ERROR",
  "SERVER_ERROR",
  "LEWAT_DEADLINE",
  "ERROR",
  "FAILED",
  "GAGAL",
  "DIARSIPKAN",
  "TIDAK_LOLOS",
  "TIDAK_LULUS",
  "TIDAK_LULUS_SKRIPSI"
];

const infoStatuses = [
  "SEMINAR_PROPOSAL",
  "KOMPRE",
  "SIDANG_SKRIPSI",
  "FINAL",
  "BIMBINGAN",
  "SEMINAR_HASIL",
  "SIDANG_KOMPRE",
  "SIDANG_AKHIR"
];

function formatStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getTone(value: string) {
  const normalized = value.toUpperCase();

  if (successStatuses.includes(normalized)) return "success";
  if (warningStatuses.includes(normalized)) return "warning";
  if (dangerStatuses.includes(normalized)) return "danger";
  if (infoStatuses.includes(normalized)) return "info";

  return "neutral";
}

export default function StatusBadge({ value, size = "md" }: StatusBadgeProps) {
  const normalizedValue = value || "-";
  const tone = getTone(normalizedValue);

  return (
    <span className={`status-badge status-${tone} status-${size}`}>
      {formatStatus(normalizedValue)}
    </span>
  );
}