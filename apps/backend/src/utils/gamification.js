import { prisma } from "../config/prisma.js";

const progressByStatus = {
  MENUNGGU_BERKAS: 10,
  MENUNGGU_APPROVAL: 20,
  MENUNGGU_JADWAL: 70,
  SIAP_SIDANG: 80,
  EVALUASI_SIDANG: 85,
  MENUNGGU_REVISI: 90,
  MENUNGGU_FINAL: 95,
  MENUNGGU_PENGESAHAN: 98,
  SELESAI: 100,
  DITOLAK: 0
};

async function awardBadge({ userId, badgeSlug }) {
  const badge = await prisma.badge.findUnique({
    where: {
      slug: badgeSlug
    }
  });

  if (!badge || !badge.isActive) {
    return null;
  }

  return prisma.userBadge.upsert({
    where: {
      userId_badgeId: {
        userId,
        badgeId: badge.id
      }
    },
    update: {},
    create: {
      userId,
      badgeId: badge.id
    }
  });
}

function calculateProgress({ skripsi, validBimbinganCount }) {
  let progress = progressByStatus[skripsi.status] ?? 0;

  if (skripsi.tahap === "KOMPRE" || skripsi.tahap === "SIDANG_SKRIPSI") {
    progress = Math.max(progress, 30);
  }

  if (validBimbinganCount > 0) {
    progress = Math.max(progress, Math.min(35 + validBimbinganCount * 4, 70));
  }

  if (skripsi.status === "SELESAI") {
    progress = 100;
  }

  return progress;
}

export async function syncGamificationBySkripsiId(skripsiId) {
  const skripsi = await prisma.skripsi.findUnique({
    where: { id: skripsiId },
    include: {
      mahasiswa: true,
      berkas: true,
      kodeEtik: true,
      bimbinganLogs: true,
      jadwalSidang: true,
      revisi: true,
      pengesahan: true
    }
  });

  if (!skripsi) {
    return null;
  }

  const validBimbinganCount = skripsi.bimbinganLogs.filter(
    (item) => item.status === "DIVALIDASI"
  ).length;

  const progressPercent = calculateProgress({
    skripsi,
    validBimbinganCount
  });

  let points = progressPercent;

  if (skripsi.berkas.some((item) => item.kategori === "PROPOSAL")) {
    points += 10;
    await awardBadge({
      userId: skripsi.mahasiswaId,
      badgeSlug: "seminar_submitted"
    });
  }

  if (validBimbinganCount >= 8) {
    points += 30;
    await awardBadge({
      userId: skripsi.mahasiswaId,
      badgeSlug: "bimbingan_8x"
    });
  }

  if (
    ["SIAP_SIDANG", "EVALUASI_SIDANG", "MENUNGGU_REVISI", "MENUNGGU_FINAL", "MENUNGGU_PENGESAHAN", "SELESAI"].includes(
      skripsi.status
    )
  ) {
    points += 40;
    await awardBadge({
      userId: skripsi.mahasiswaId,
      badgeSlug: "sidang_ready"
    });
  }

  if (skripsi.status === "SELESAI") {
    points += 100;
    await awardBadge({
      userId: skripsi.mahasiswaId,
      badgeSlug: "final_approved"
    });
  }

  const gamification = await prisma.gamification.upsert({
    where: {
      skripsiId
    },
    update: {
      progressPercent,
      points
    },
    create: {
      skripsiId,
      progressPercent,
      points
    }
  });

  return {
    skripsiId,
    progressPercent,
    points,
    validBimbinganCount,
    gamification
  };
}