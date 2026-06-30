import { prisma } from "../../config/prisma.js";

export const SIDANG_ACTIVE_STATUSES = [
  "DRAFT",
  "MENUNGGU_BERKAS",
  "MENUNGGU_PENGUJI",
  "MENUNGGU_JADWAL",
  "DIJADWALKAN",
  "BERLANGSUNG",
  "MENUNGGU_NILAI",
  "MENUNGGU_KEPUTUSAN"
];

export const SIDANG_FINISHED_STATUSES = [
  "SELESAI",
  "DIBATALKAN"
];

export async function getWorkflowRuleInt(stageCode, ruleKey, fallbackValue) {
  const rule = await prisma.workflowRule.findUnique({
    where: {
      stageCode_ruleKey: {
        stageCode,
        ruleKey
      }
    }
  });


  
  const value = Number(rule?.ruleValue ?? fallbackValue);

  if (Number.isNaN(value)) {
    return fallbackValue;
  }

  return value;
}

export async function getWorkflowRuleStringList(
  stageCode,
  ruleKey,
  fallbackValue = []
) {
  const rule = await prisma.workflowRule.findUnique({
    where: {
      stageCode_ruleKey: {
        stageCode,
        ruleKey
      }
    }
  });

  const rawValue = rule?.ruleValue;

  if (rawValue === null || rawValue === undefined) {
    return fallbackValue;
  }

  const normalizedValue = String(rawValue).trim();

  if (!normalizedValue) {
    return [];
  }

  return normalizedValue
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function getNextAttemptNo(skripsiId, jenis) {
  const latest = await prisma.sidang.findFirst({
    where: {
      skripsiId,
      jenis
    },
    orderBy: {
      attemptNo: "desc"
    }
  });

  return Number(latest?.attemptNo ?? 0) + 1;
}

export async function getActiveSidang(skripsiId, jenis) {
  return prisma.sidang.findFirst({
    where: {
      skripsiId,
      jenis,
      status: {
        in: SIDANG_ACTIVE_STATUSES
      }
    },
    orderBy: {
      attemptNo: "desc"
    }
  });
}

export async function getLatestSidang(skripsiId, jenis) {
  return prisma.sidang.findFirst({
    where: {
      skripsiId,
      jenis
    },
    orderBy: {
      attemptNo: "desc"
    }
  });
}

export function canRepeatSeminarProposal(latestSidang) {
  if (!latestSidang) return true;

  if (latestSidang.hasil === "LOLOS") return false;

  return ["TIDAK_LOLOS", "ULANG", "REVISI"].includes(latestSidang.hasil);
}

export async function getAssignedPengujiCount(sidangId) {
  return prisma.sidangDosen.count({
    where: {
      sidangId,
      peran: {
        in: ["PENGUJI", "KETUA_PENGUJI"]
      },
      isActive: true
    }
  });
}

export async function isSidangPenguji(sidangId, dosenId) {
  const row = await prisma.sidangDosen.findFirst({
    where: {
      sidangId,
      dosenId,
      isActive: true,
      peran: {
        in: ["PENGUJI", "KETUA_PENGUJI"]
      }
    }
  });

  return Boolean(row);
}

export async function syncSidangReadinessStatus(sidangId) {
  const sidang = await prisma.sidang.findUnique({
    where: {
      id: sidangId
    },
    include: {
      jadwalSidang: true
    }
  });

  if (!sidang) return null;

  if (["SELESAI", "DIBATALKAN"].includes(sidang.status)) {
    return sidang;
  }

  const requiredBerkas = await getWorkflowRuleStringList(
    sidang.jenis,
    "REQUIRED_BERKAS",
    sidang.jenis === "SEMINAR_PROPOSAL"
      ? ["PROPOSAL", "PRESENTASI"]
      : sidang.jenis === "SEMINAR_HASIL"
        ? ["SIDANG_SOFTCOPY", "SIDANG_PRESENTASI"]
        : sidang.jenis === "SIDANG_AKHIR"
          ? ["FINAL_SKRIPSI"]
          : []
  );

  const uploadedBerkas = await prisma.berkas.findMany({
    where: {
      sidangId,
      kategori: {
        in: requiredBerkas
      },
      status: {
        not: "DITOLAK"
      }
    },
    select: {
      kategori: true
    }
  });

  const uploadedKategori = new Set(uploadedBerkas.map((item) => item.kategori));
  const allRequiredUploaded = requiredBerkas.every((kategori) =>
    uploadedKategori.has(kategori)
  );

  const minPenguji = await getWorkflowRuleInt(
    sidang.jenis,
    "MIN_PENGUJI",
    sidang.jenis === "SIDANG_AKHIR" ? 2 : 2
  );

  const pengujiCount = await getAssignedPengujiCount(sidangId);
  const hasJadwal = sidang.jadwalSidang.length > 0;

  let nextStatus = sidang.status;

  if (!allRequiredUploaded) {
    nextStatus = "MENUNGGU_BERKAS";
  } else if (pengujiCount < minPenguji) {
    nextStatus = "MENUNGGU_PENGUJI";
  } else if (hasJadwal) {
    nextStatus = "DIJADWALKAN";
  } else {
    nextStatus = "MENUNGGU_JADWAL";
  }

  if (nextStatus === sidang.status) {
    return sidang;
  }

  return prisma.sidang.update({
    where: {
      id: sidangId
    },
    data: {
      status: nextStatus
    }
  });
}