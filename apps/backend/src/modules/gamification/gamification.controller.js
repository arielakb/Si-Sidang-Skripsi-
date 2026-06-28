import { prisma } from "../../config/prisma.js";
import { getUserRoles } from "../rbac/rbac.service.js";
import { syncGamificationBySkripsiId } from "../../utils/gamification.js";

async function canAccessSkripsi(userId, skripsi) {
  if (!skripsi) return false;

  const roles = await getUserRoles(userId);

  if (roles.includes("admin") || roles.includes("ketua_prodi") || roles.includes("dosen_koordinator")) {
    return true;
  }

  if (skripsi.mahasiswaId === userId) {
    return true;
  }

  return skripsi.dosenSkripsi.some(
    (item) => item.dosenId === userId && item.isActive
  );
}

export async function getMyGamificationDashboard(req, res, next) {
  try {
    const skripsiList = await prisma.skripsi.findMany({
      where: {
        mahasiswaId: req.user.id
      },
      include: {
        gamification: true,
        berkas: true,
        bimbinganLogs: true,
        jadwalSidang: true,
        revisi: true,
        pengesahan: true,
        dosenSkripsi: {
          where: {
            isActive: true
          },
          include: {
            dosen: {
              select: {
                id: true,
                identifier: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    for (const skripsi of skripsiList) {
      await syncGamificationBySkripsiId(skripsi.id);
    }

    const refreshedSkripsiList = await prisma.skripsi.findMany({
      where: {
        mahasiswaId: req.user.id
      },
      include: {
        gamification: true,
        bimbinganLogs: true,
        jadwalSidang: true,
        revisi: true,
        pengesahan: true,
        dosenSkripsi: {
          where: {
            isActive: true
          },
          include: {
            dosen: {
              select: {
                id: true,
                identifier: true,
                name: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const badges = await prisma.userBadge.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        badge: true
      },
      orderBy: {
        awardedAt: "desc"
      }
    });

    const missions = await prisma.mission.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        points: "desc"
      }
    });

    const totalPoints = refreshedSkripsiList.reduce(
      (sum, item) => sum + (item.gamification?.points ?? 0),
      0
    );

    return res.json({
      success: true,
      data: {
        totalPoints,
        totalBadges: badges.length,
        skripsi: refreshedSkripsiList.map((item) => {
          const validBimbinganCount = item.bimbinganLogs.filter(
            (log) => log.status === "DIVALIDASI"
          ).length;

          return {
            id: item.id,
            title: item.title,
            tahap: item.tahap,
            status: item.status,
            progressPercent: item.gamification?.progressPercent ?? 0,
            points: item.gamification?.points ?? 0,
            validBimbinganCount,
            requiredBimbinganCount: 8,
            canRequestSidang: validBimbinganCount >= 8,
            dosenSkripsi: item.dosenSkripsi
          };
        }),
        badges,
        missions
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSkripsiProgress(req, res, next) {
  try {
    const { skripsiId } = req.params;

    const skripsi = await prisma.skripsi.findUnique({
      where: { id: skripsiId },
      include: {
        gamification: true,
        berkas: true,
        bimbinganLogs: true,
        jadwalSidang: true,
        revisi: true,
        pengesahan: true,
        dosenSkripsi: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const allowed = await canAccessSkripsi(req.user.id, skripsi);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke progress skripsi ini"
      });
    }

    const synced = await syncGamificationBySkripsiId(skripsiId);

    const refreshed = await prisma.skripsi.findUnique({
      where: { id: skripsiId },
      include: {
        gamification: true,
        berkas: true,
        bimbinganLogs: true,
        jadwalSidang: true,
        revisi: true,
        pengesahan: true
      }
    });

    const validBimbinganCount = refreshed.bimbinganLogs.filter(
      (item) => item.status === "DIVALIDASI"
    ).length;

    return res.json({
      success: true,
      data: {
        skripsiId,
        title: refreshed.title,
        tahap: refreshed.tahap,
        status: refreshed.status,
        progressPercent: refreshed.gamification?.progressPercent ?? synced?.progressPercent ?? 0,
        points: refreshed.gamification?.points ?? synced?.points ?? 0,
        validBimbinganCount,
        requiredBimbinganCount: 8,
        canRequestSidang: validBimbinganCount >= 8,
        checklist: {
          proposalUploaded: refreshed.berkas.some((item) => item.kategori === "PROPOSAL"),
          presentationUploaded: refreshed.berkas.some((item) => item.kategori === "PRESENTASI"),
          bimbinganComplete: validBimbinganCount >= 8,
          jadwalSidangReady: refreshed.jadwalSidang.length > 0,
          revisiApproved:
            refreshed.revisi.length > 0 &&
            refreshed.revisi.every((item) => item.status === "DISETUJUI"),
          finalApproved: refreshed.status === "SELESAI"
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function syncSkripsiGamification(req, res, next) {
  try {
    const { skripsiId } = req.params;

    const skripsi = await prisma.skripsi.findUnique({
      where: { id: skripsiId },
      include: {
        dosenSkripsi: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const allowed = await canAccessSkripsi(req.user.id, skripsi);

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke progress skripsi ini"
      });
    }

    const data = await syncGamificationBySkripsiId(skripsiId);

    return res.json({
      success: true,
      message: "Gamification berhasil disinkronkan",
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function getLeaderboard(req, res, next) {
  try {
    const data = await prisma.gamification.findMany({
      take: 10,
      orderBy: {
        points: "desc"
      },
      include: {
        skripsi: {
          include: {
            mahasiswa: {
              select: {
                id: true,
                identifier: true,
                name: true
              }
            }
          }
        }
      }
    });

    return res.json({
      success: true,
      data: data.map((item, index) => ({
        rank: index + 1,
        points: item.points,
        progressPercent: item.progressPercent,
        mahasiswa: item.skripsi.mahasiswa,
        skripsi: {
          id: item.skripsi.id,
          title: item.skripsi.title,
          tahap: item.skripsi.tahap,
          status: item.skripsi.status
        }
      }))
    });
  } catch (error) {
    return next(error);
  }
}