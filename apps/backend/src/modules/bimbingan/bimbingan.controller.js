import { prisma } from "../../config/prisma.js";
import { getUserRoles } from "../rbac/rbac.service.js";
import { createNotification } from "../../utils/notification.js";
import {
  getActiveSidang,
  getLatestSidang,
  getNextAttemptNo,
  getWorkflowRuleInt
} from "../sidang/sidang.service.js";

async function getSkripsiOr404(skripsiId) {
  return prisma.skripsi.findUnique({
    where: { id: skripsiId },
    include: {
      mahasiswa: true,
      dosenSkripsi: {
        where: {
          isActive: true
        },
        include: {
          dosen: true
        }
      }
    }
  });
}

function getActivePembimbingIds(skripsi) {
  return skripsi.dosenSkripsi
    .filter((item) => item.peran === "PEMBIMBING" && item.isActive)
    .map((item) => item.dosenId);
}

function isMahasiswaOwner(skripsi, userId) {
  return skripsi.mahasiswaId === userId;
}

function isPembimbing(skripsi, userId) {
  return getActivePembimbingIds(skripsi).includes(userId);
}


function isBimbinganReadAllRole(roles) {
  return roles.some((role) =>
    ["admin", "ketua_prodi", "dosen_koordinator", "staf_prodi"].includes(role)
  );
}

async function canReadBimbinganSkripsi(skripsi, userId) {
  const roles = await getUserRoles(userId);

  if (isBimbinganReadAllRole(roles)) {
    return true;
  }

  return isMahasiswaOwner(skripsi, userId) || isPembimbing(skripsi, userId);
}


async function getRequiredBimbinganCount() {
  return getWorkflowRuleInt("BIMBINGAN", "MIN_BIMBINGAN_VALID", 8);
}

export async function getBimbinganBySkripsi(req, res, next) {
  try {
    const { skripsiId } = req.params;

    const skripsi = await getSkripsiOr404(skripsiId);

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const canRead = await canReadBimbinganSkripsi(skripsi, req.user.id);

    if (!canRead) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke data bimbingan ini"
      });
    }

    const data = await prisma.bimbinganLog.findMany({
      where: { skripsiId },
      include: {
        mahasiswa: {
          select: {
            id: true,
            identifier: true,
            name: true
          }
        },
        dosen: {
          select: {
            id: true,
            identifier: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const validCount = data.filter((item) => item.status === "DIVALIDASI").length;
    const requiredCount = await getRequiredBimbinganCount();

    return res.json({
      success: true,
      data,
      meta: {
        validCount,
        requiredCount,
        canRequestSidang: validCount >= requiredCount
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function requestBimbingan(req, res, next) {
  try {
    const { skripsiId } = req.params;
    const { dosenId, jadwalMulai, jadwalSelesai, topik } = req.body;

    if (!dosenId || !jadwalMulai || !jadwalSelesai || !topik) {
      return res.status(400).json({
        success: false,
        message: "Dosen, jadwal mulai, jadwal selesai, dan topik wajib diisi"
      });
    }

    const skripsi = await getSkripsiOr404(skripsiId);

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    if (!isMahasiswaOwner(skripsi, req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Hanya mahasiswa pemilik skripsi yang bisa mengajukan bimbingan"
      });
    }

    const pembimbingIds = getActivePembimbingIds(skripsi);

    if (!pembimbingIds.includes(dosenId)) {
      return res.status(400).json({
        success: false,
        message: "Dosen yang dipilih bukan pembimbing aktif skripsi ini"
      });
    }

    const bimbingan = await prisma.bimbinganLog.create({
      data: {
        skripsiId,
        mahasiswaId: req.user.id,
        dosenId,
        jadwalMulai: new Date(jadwalMulai),
        jadwalSelesai: new Date(jadwalSelesai),
        topik,
        status: "DIAJUKAN"
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
    });

    await createNotification({
      userId: dosenId,
      title: "Pengajuan Bimbingan Baru",
      message: `${skripsi.mahasiswa.name} mengajukan jadwal bimbingan.`,
      type: "BIMBINGAN_DIAJUKAN",
      entityType: "bimbingan",
      entityId: bimbingan.id
    });

    return res.status(201).json({
      success: true,
      message: "Pengajuan bimbingan berhasil dibuat",
      data: bimbingan
    });
  } catch (error) {
    return next(error);
  }
}

export async function confirmBimbingan(req, res, next) {
  try {
    const { id } = req.params;
    const { jadwalMulai, jadwalSelesai, catatanDosen } = req.body;

    const bimbingan = await prisma.bimbinganLog.findUnique({
      where: { id },
      include: {
        skripsi: {
          include: {
            mahasiswa: true
          }
        }
      }
    });

    if (!bimbingan) {
      return res.status(404).json({
        success: false,
        message: "Bimbingan tidak ditemukan"
      });
    }

    if (bimbingan.dosenId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Hanya dosen pembimbing terkait yang bisa menyetujui bimbingan"
      });
    }

    if (bimbingan.status !== "DIAJUKAN") {
      return res.status(400).json({
        success: false,
        message: "Bimbingan hanya bisa disetujui dari status DIAJUKAN"
      });
    }

    const updated = await prisma.bimbinganLog.update({
      where: { id },
      data: {
        status: "DISETUJUI",
        jadwalMulai: jadwalMulai ? new Date(jadwalMulai) : bimbingan.jadwalMulai,
        jadwalSelesai: jadwalSelesai ? new Date(jadwalSelesai) : bimbingan.jadwalSelesai,
        catatanDosen
      }
    });

    await createNotification({
      userId: bimbingan.mahasiswaId,
      title: "Bimbingan Disetujui",
      message: "Dosen pembimbing telah menyetujui pengajuan bimbingan Anda.",
      type: "BIMBINGAN_DISETUJUI",
      entityType: "bimbingan",
      entityId: bimbingan.id
    });

    return res.json({
      success: true,
      message: "Bimbingan berhasil disetujui",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

export async function rejectBimbingan(req, res, next) {
  try {
    const { id } = req.params;
    const { catatanDosen } = req.body;

    const bimbingan = await prisma.bimbinganLog.findUnique({
      where: { id }
    });

    if (!bimbingan) {
      return res.status(404).json({
        success: false,
        message: "Bimbingan tidak ditemukan"
      });
    }

    if (bimbingan.dosenId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Hanya dosen pembimbing terkait yang bisa menolak bimbingan"
      });
    }

    if (bimbingan.status !== "DIAJUKAN") {
      return res.status(400).json({
        success: false,
        message: "Bimbingan hanya bisa ditolak dari status DIAJUKAN"
      });
    }

    const updated = await prisma.bimbinganLog.update({
      where: { id },
      data: {
        status: "DITOLAK",
        catatanDosen
      }
    });

    await createNotification({
      userId: bimbingan.mahasiswaId,
      title: "Bimbingan Ditolak",
      message: catatanDosen || "Dosen pembimbing menolak pengajuan bimbingan Anda.",
      type: "BIMBINGAN_DITOLAK",
      entityType: "bimbingan",
      entityId: bimbingan.id
    });

    return res.json({
      success: true,
      message: "Bimbingan berhasil ditolak",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

export async function completeBimbingan(req, res, next) {
  try {
    const { id } = req.params;
    const { hasil, catatanDosen } = req.body;

    if (!hasil) {
      return res.status(400).json({
        success: false,
        message: "Hasil bimbingan wajib diisi"
      });
    }

    const bimbingan = await prisma.bimbinganLog.findUnique({
      where: { id },
      include: {
        skripsi: true
      }
    });

    if (!bimbingan) {
      return res.status(404).json({
        success: false,
        message: "Bimbingan tidak ditemukan"
      });
    }

    if (bimbingan.dosenId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Hanya dosen pembimbing terkait yang bisa mengisi hasil bimbingan"
      });
    }

    if (bimbingan.status !== "DISETUJUI") {
      return res.status(400).json({
        success: false,
        message: "Hasil bimbingan hanya bisa diisi setelah bimbingan DISETUJUI"
      });
    }

    const updated = await prisma.bimbinganLog.update({
      where: { id },
      data: {
        hasil,
        catatanDosen,
        status: "SELESAI"
      }
    });

    await createNotification({
      userId: bimbingan.mahasiswaId,
      title: "Hasil Bimbingan Telah Diisi",
      message: "Silakan konfirmasi bimbingan agar masuk ke counter valid.",
      type: "BIMBINGAN_SELESAI",
      entityType: "bimbingan",
      entityId: bimbingan.id
    });

    return res.json({
      success: true,
      message: "Hasil bimbingan berhasil disimpan",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

export async function validateBimbinganByMahasiswa(req, res, next) {
  try {
    const { id } = req.params;
    const { catatanMahasiswa } = req.body;

    const bimbingan = await prisma.bimbinganLog.findUnique({
      where: { id },
      include: {
        skripsi: true,
        dosen: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!bimbingan) {
      return res.status(404).json({
        success: false,
        message: "Bimbingan tidak ditemukan"
      });
    }

    if (bimbingan.mahasiswaId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Hanya mahasiswa terkait yang bisa mengonfirmasi bimbingan"
      });
    }

    if (bimbingan.status !== "SELESAI") {
      return res.status(400).json({
        success: false,
        message: "Bimbingan hanya bisa dikonfirmasi setelah status SELESAI"
      });
    }

    const updated = await prisma.bimbinganLog.update({
      where: { id },
      data: {
        status: "DIVALIDASI",
        catatanMahasiswa,
        validatedAt: new Date()
      }
    });

    const validCount = await prisma.bimbinganLog.count({
      where: {
        skripsiId: bimbingan.skripsiId,
        status: "DIVALIDASI"
      }
    });

    const progressPercent = Math.min(35 + validCount * 4, 70);

    await prisma.gamification.upsert({
      where: {
        skripsiId: bimbingan.skripsiId
      },
      update: {
        progressPercent,
        points: {
          increment: 10
        }
      },
      create: {
        skripsiId: bimbingan.skripsiId,
        progressPercent,
        points: 10
      }
    });

    const requiredCount = await getRequiredBimbinganCount();

    await createNotification({
      userId: bimbingan.dosenId,
      title: "Bimbingan Divalidasi Mahasiswa",
      message: `Mahasiswa telah mengonfirmasi bimbingan. Counter saat ini ${validCount}/${requiredCount}.`,
      type: "BIMBINGAN_DIVALIDASI",
      entityType: "bimbingan",
      entityId: bimbingan.id
    });

    return res.json({
      success: true,
      message: "Bimbingan berhasil dikonfirmasi dan masuk counter valid",
      data: {
        bimbingan: updated,
        counter: {
          validCount,
          requiredCount,
          canRequestSidang: validCount >= requiredCount
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function approveMajuSidang(req, res, next) {
  try {
    const { skripsiId } = req.params;
    const { catatan } = req.body ?? {};

    const skripsi = await prisma.skripsi.findUnique({
      where: {
        id: skripsiId
      },
      include: {
        mahasiswa: {
          select: {
            id: true,
            identifier: true,
            name: true,
            email: true
          }
        },
        dosenSkripsi: {
          where: {
            peran: "PEMBIMBING",
            isActive: true
          },
          include: {
            dosen: {
              select: {
                id: true,
                identifier: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const isAssignedPembimbing = skripsi.dosenSkripsi.some(
      (item) => item.dosenId === req.user.id
    );

    if (!isAssignedPembimbing) {
      return res.status(403).json({
        success: false,
        message:
          "Hanya dosen pembimbing aktif pada skripsi ini yang dapat approve maju seminar hasil"
      });
    }

    if (
      ["SELESAI", "DITOLAK", "NONAKTIF", "DIBATALKAN", "DIARSIPKAN"].includes(
        skripsi.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Skripsi sudah tidak aktif"
      });
    }

    const requiredCount = await getRequiredBimbinganCount();

    const validCount = await prisma.bimbinganLog.count({
      where: {
        skripsiId,
        status: "DIVALIDASI"
      }
    });

    if (validCount < requiredCount) {
      return res.status(400).json({
        success: false,
        message: `Minimal bimbingan valid untuk maju seminar hasil adalah ${requiredCount}. Saat ini baru ${validCount}.`
      });
    }

    const activeSeminarHasil = await getActiveSidang(
      skripsiId,
      "SEMINAR_HASIL"
    );

    if (activeSeminarHasil) {
      return res.status(409).json({
        success: false,
        message:
          "Seminar hasil aktif sudah ada. Lanjutkan proses seminar hasil tersebut."
      });
    }

    const latestSeminarHasil = await getLatestSidang(
      skripsiId,
      "SEMINAR_HASIL"
    );

    if (latestSeminarHasil?.hasil === "LOLOS") {
      return res.status(409).json({
        success: false,
        message: "Seminar hasil sudah lolos"
      });
    }

    const attemptNo = await getNextAttemptNo(skripsiId, "SEMINAR_HASIL");

    const result = await prisma.$transaction(async (tx) => {
      const sidang = await tx.sidang.create({
        data: {
          skripsiId,
          jenis: "SEMINAR_HASIL",
          attemptNo,
          status: "MENUNGGU_BERKAS",
          createdById: req.user.id,
          catatanHasil: catatan || null
        }
      });

      const updatedSkripsi = await tx.skripsi.update({
        where: {
          id: skripsiId
        },
        data: {
          tahap: "SIDANG_SKRIPSI",
          status: "MENUNGGU_SEMINAR_HASIL",
          sidangApprovedAt: new Date()
        },
        include: {
          mahasiswa: {
            select: {
              id: true,
              identifier: true,
              name: true,
              email: true
            }
          },
          peminatan: true,
          jenisSkripsi: true,
          dosenSkripsi: {
            where: {
              isActive: true
            },
            include: {
              dosen: {
                select: {
                  id: true,
                  identifier: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      });

      return {
        sidang,
        skripsi: updatedSkripsi
      };
    });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Disetujui Maju Seminar Hasil",
      message:
        "Pembimbing telah menyetujui Anda untuk maju seminar hasil. Silakan upload berkas seminar hasil.",
      type: "SEMINAR_HASIL_READY",
      entityType: "sidang",
      entityId: result.sidang.id
    });

    return res.json({
      success: true,
      message: "Mahasiswa berhasil disetujui maju seminar hasil",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}