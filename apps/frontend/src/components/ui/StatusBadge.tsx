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
  "SETUJU"
];

const warningStatuses = [
  "MENUNGGU_BERKAS",
  "MENUNGGU_APPROVAL",
  "MENUNGGU_JADWAL",
  "MENUNGGU_REVISI",
  "MENUNGGU_FINAL",
  "MENUNGGU_PENGESAHAN",
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
  "BELUM_DISETUJUI"
];

const dangerStatuses = [
  "INACTIVE",
  "NONAKTIF",
  "DITOLAK",
  "TOLAK",
  "REJECTED",
  "DIBATALKAN",
  "DIARSIPKAN",
  "DELETE",
  "CLIENT_ERROR",
  "SERVER_ERROR",
  "LEWAT_DEADLINE",
  "ERROR",
  "FAILED",
  "GAGAL"
];

const infoStatuses = [
  "KOMPRE",
  "SEMINAR_PROPOSAL",
  "SIDANG_SKRIPSI",
  "FINAL",
  "FINALISASI",
  "PRESENTASI",
  "PROPOSAL",
  "GET",
  "READ"
];

function normalizeStatus(value?: string | null) {
  return String(value || "-").trim().toUpperCase();
}

function getStatusClass(value?: string | null) {
  const normalized = normalizeStatus(value);

  if (successStatuses.includes(normalized)) return "status-success";
  if (warningStatuses.includes(normalized)) return "status-warning";
  if (dangerStatuses.includes(normalized)) return "status-danger";
  if (infoStatuses.includes(normalized)) return "status-info";

  return "status-neutral";
}

function formatStatus(value?: string | null) {
  const normalized = normalizeStatus(value);

  if (normalized === "-") return "-";

  return normalized.replaceAll("_", " ");
}

export default function StatusBadge({ value, size = "md" }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${getStatusClass(value)} status-badge-${size}`}>
      {formatStatus(value)}
    </span>
  );
}