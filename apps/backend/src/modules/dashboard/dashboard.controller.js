import { prisma } from "../../config/prisma.js";
import { getUserRoles } from "../rbac/rbac.service.js";

export async function getMyDashboardSummary(req, res, next) {
  try {
    const roles = await getUserRoles(req.user.id);

    const unreadNotifications = await prisma.notifikasi.count({
      where: {
        userId: req.user.id,
        status: "UNREAD"
      }
    });

    if (roles.includes("mahasiswa")) {
      const skripsi = await prisma.skripsi.findMany({
        where: {
          mahasiswaId: req.user.id
        },
        include: {
          gamification: true,
          bimbinganLogs: true,
          jadwalSidang: true,
          revisi: true
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return res.json({
        success: true,
        data: {
          roleContext: "mahasiswa",
          unreadNotifications,
          activeSkripsi: skripsi.filter((item) => item.status !== "SELESAI" && item.status !== "DITOLAK").length,
          completedSkripsi: skripsi.filter((item) => item.status === "SELESAI").length,
          totalBimbinganValid: skripsi.reduce(
            (sum, item) =>
              sum + item.bimbinganLogs.filter((log) => log.status === "DIVALIDASI").length,
            0
          ),
          nextJadwalSidang: skripsi
            .flatMap((item) => item.jadwalSidang)
            .filter((item) => ["DIJADWALKAN", "BERLANGSUNG"].includes(item.status))
            .sort((a, b) => new Date(a.waktuMulai) - new Date(b.waktuMulai))[0] ?? null,
          latestSkripsi: skripsi[0] ?? null
        }
      });
    }

    if (
      roles.includes("dosen_pembimbing") ||
      roles.includes("dosen_penguji") ||
      roles.includes("dosen_koordinator")
    ) {
      const assignments = await prisma.skripsiDosen.findMany({
        where: {
          dosenId: req.user.id,
          isActive: true
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
              },
              jadwalSidang: true,
              bimbinganLogs: true
            }
          }
        }
      });

      const pendingBimbingan = await prisma.bimbinganLog.count({
        where: {
          dosenId: req.user.id,
          status: "DIAJUKAN"
        }
      });

      return res.json({
        success: true,
        data: {
          roleContext: "dosen",
          unreadNotifications,
          activeAssignments: assignments.length,
          pendingBimbingan,
          upcomingSidang: assignments
            .flatMap((item) => item.skripsi.jadwalSidang)
            .filter((item) => ["DIJADWALKAN", "BERLANGSUNG"].includes(item.status))
            .sort((a, b) => new Date(a.waktuMulai) - new Date(b.waktuMulai))
            .slice(0, 5),
          assignments: assignments.slice(0, 10)
        }
      });
    }

    const [
      totalUsers,
      activeSkripsi,
      waitingSchedule,
      readySidang,
      selesai,
      pendingPeminjaman
    ] = await prisma.$transaction([
      prisma.user.count(),
      prisma.skripsi.count({
        where: {
          status: {
            notIn: ["SELESAI", "DITOLAK"]
          }
        }
      }),
      prisma.skripsi.count({
        where: {
          status: "MENUNGGU_JADWAL"
        }
      }),
      prisma.skripsi.count({
        where: {
          status: "SIAP_SIDANG"
        }
      }),
      prisma.skripsi.count({
        where: {
          status: "SELESAI"
        }
      }),
      prisma.peminjamanRuang.count({
        where: {
          status: "DIAJUKAN"
        }
      })
    ]);

    return res.json({
      success: true,
      data: {
        roleContext: "admin",
        unreadNotifications,
        totalUsers,
        activeSkripsi,
        waitingSchedule,
        readySidang,
        selesai,
        pendingPeminjaman
      }
    });
  } catch (error) {
    return next(error);
  }
}