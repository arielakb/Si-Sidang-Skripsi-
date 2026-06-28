export function getInitials(name?: string | null) {
  if (!name) return "U";

  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "U";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function formatStatus(value?: string | null) {
  if (!value) return "-";

  return value.replace(/_/g, " ");
}

export function getStatusTone(value?: string | null) {
  const status = value?.toUpperCase() || "";

  if (
    [
      "ACTIVE",
      "SELESAI",
      "DISETUJUI",
      "DIVALIDASI",
      "APPROVE",
      "APPROVED",
      "FINALIZED"
    ].includes(status)
  ) {
    return "success";
  }

  if (
    [
      "DITOLAK",
      "DIBATALKAN",
      "INACTIVE",
      "REJECT",
      "REJECTED",
      "FAILED"
    ].includes(status)
  ) {
    return "danger";
  }

  if (
    status.startsWith("MENUNGGU") ||
    ["DIAJUKAN", "PENDING", "REVIEW"].includes(status)
  ) {
    return "warning";
  }

  if (["SIAP_SIDANG", "BERLANGSUNG", "EVALUASI_SIDANG"].includes(status)) {
    return "info";
  }

  return "neutral";
}

export function getRoleLabel(role?: string | null) {
  const labels: Record<string, string> = {
    admin: "Admin",
    mahasiswa: "Mahasiswa",
    dosen_reguler: "Dosen Reguler",
    dosen_pembimbing: "Dosen Pembimbing",
    dosen_penguji: "Dosen Penguji",
    dosen_koordinator: "Dosen Koordinator",
    ketua_prodi: "Ketua Prodi",
    staf_prodi: "Staf Prodi"
  };

  return role ? labels[role] || formatStatus(role) : "User";
}

export function getRoleTone(role?: string | null) {
  if (role === "admin") return "danger";
  if (role === "ketua_prodi") return "success";
  if (role === "dosen_koordinator") return "info";
  if (role === "staf_prodi") return "warning";
  if (role?.startsWith("dosen")) return "neutral";
  if (role === "mahasiswa") return "success";

  return "neutral";
}