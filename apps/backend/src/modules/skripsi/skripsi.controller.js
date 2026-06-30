import { prisma } from "../../config/prisma.js";
import { createNotification } from "../../utils/notification.js";
import { getUserRoles } from "../rbac/rbac.service.js";
import { getWorkflowRuleInt } from "../sidang/sidang.service.js";

async function isAssignedDosenPembimbing(skripsiId, dosenId) {
  const assignment = await prisma.skripsiDosen.findFirst({
    where: {
      skripsiId,
      dosenId,
      peran: "PEMBIMBING",
      isActive: true
    }
  });

  return Boolean(assignment);
}

async function safeCount(delegate, args) {
  if (!delegate?.count) return 0;
  return delegate.count(args);
}

async function safeDeleteMany(delegate, args) {
  if (!delegate?.deleteMany) return;
  return delegate.deleteMany(args);
}

async function getSkripsiPermanentDeleteDependencies(skripsiId) {
  const [
    berkas,
    kodeEtik,
    dosenSkripsi,
    bimbinganLogs,
    jadwalSidang,
    nilaiSidang,
    revisi,
    revisiSidang,
    pengesahan,
    suratPerjanjian
  ] = await Promise.all([
    safeCount(prisma.berkas, { where: { skripsiId } }),
    safeCount(prisma.kodeEtik, { where: { skripsiId } }),
    safeCount(prisma.skripsiDosen, { where: { skripsiId } }),
    safeCount(prisma.bimbinganLog, { where: { skripsiId } }),
    safeCount(prisma.jadwalSidang, { where: { skripsiId } }),
    safeCount(prisma.nilaiSidang, { where: { skripsiId } }),
    safeCount(prisma.revisi, { where: { skripsiId } }),
    safeCount(prisma.revisiSidang, { where: { skripsiId } }),
    safeCount(prisma.pengesahan, { where: { skripsiId } }),
    safeCount(prisma.suratPerjanjian, { where: { skripsiId } })
  ]);

  const details = {
    berkas,
    kodeEtik,
    dosenSkripsi,
    bimbinganLogs,
    jadwalSidang,
    nilaiSidang,
    revisi: revisi + revisiSidang,
    pengesahan,
    suratPerjanjian
  };

  const total = Object.values(details).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );

  return {
    total,
    details
  };
}

export async function getMySkripsi(req, res, next) {
  try {
    const data = await prisma.skripsi.findMany({
      where: {
        mahasiswaId: req.user.id
      },
      include: {
        peminatan: true,
        jenisSkripsi: true,
        gamification: true,
        dosenSkripsi: {
          where: { isActive: true },
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
        },
        bimbinganLogs: {
          orderBy: {
            createdAt: "desc"
          }
        },
        berkas: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSkripsiDetail(req, res, next) {
  try {
    const { id } = req.params;

    const data = await prisma.skripsi.findUnique({
      where: { id },
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
        gamification: true,
        dosenSkripsi: {
          where: { isActive: true },
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
        },
        bimbinganLogs: {
          orderBy: {
            createdAt: "desc"
          }
        },
        berkas: true,
        jadwalSidang: true,
        nilaiSidang: true,
        revisi: true,
        pengesahan: true
      }
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    return res.json({
      success: true,
      data
    });
  } catch (error) {
    return next(error);
  }
}

export async function assignPembimbing(req, res, next) {
  try {
    const { id } = req.params;
    const uniqueDosenIds = Array.from(
      new Set((req.body?.dosenIds ?? []).filter(Boolean))
    );

    if (!Array.isArray(req.body?.dosenIds) || uniqueDosenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal satu dosen pembimbing wajib dipilih"
      });
    }

    const minPembimbing = await getWorkflowRuleInt(
      "BIMBINGAN",
      "MIN_PEMBIMBING",
      2
    );

    if (uniqueDosenIds.length < minPembimbing) {
      return res.status(400).json({
        success: false,
        message: `Minimal dosen pembimbing adalah ${minPembimbing}.`
      });
    }

    const skripsi = await prisma.skripsi.findUnique({
      where: { id },
      include: {
        mahasiswa: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    if (!["KOMPRE", "SIDANG_SKRIPSI"].includes(skripsi.tahap)) {
      return res.status(400).json({
        success: false,
        message:
          "Pembimbing hanya bisa ditetapkan setelah seminar proposal lolos"
      });
    }

    if (
      ["SELESAI", "DITOLAK", "NONAKTIF", "DIBATALKAN", "DIARSIPKAN"].includes(
        skripsi.status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Skripsi sudah tidak aktif sehingga pembimbing tidak dapat diubah"
      });
    }

    const dosenUsers = await prisma.user.findMany({
      where: {
        id: {
          in: uniqueDosenIds
        },
        status: "ACTIVE",
        userRoles: {
          some: {
            role: {
              slug: {
                in: ["dosen_pembimbing", "dosen_koordinator", "ketua_prodi"]
              }
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        identifier: true,
        email: true
      }
    });

    if (dosenUsers.length !== uniqueDosenIds.length) {
      return res.status(400).json({
        success: false,
        message:
          "Sebagian dosen tidak valid, tidak aktif, atau bukan dosen pembimbing"
      });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.skripsiDosen.updateMany({
        where: {
          skripsiId: id,
          peran: "PEMBIMBING",
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      for (const dosen of dosenUsers) {
        await tx.skripsiDosen.upsert({
          where: {
            skripsiId_dosenId_peran: {
              skripsiId: id,
              dosenId: dosen.id,
              peran: "PEMBIMBING"
            }
          },
          update: {
            isActive: true,
            assignedById: req.user.id,
            assignedAt: new Date(),
            bobotNilai: null
          },
          create: {
            skripsiId: id,
            dosenId: dosen.id,
            peran: "PEMBIMBING",
            assignedById: req.user.id,
            bobotNilai: null
          }
        });
      }

      return tx.skripsi.update({
        where: { id },
        data: {
          status: "BIMBINGAN"
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
    });

    for (const dosen of dosenUsers) {
      await createNotification({
        userId: dosen.id,
        title: "Penugasan Dosen Pembimbing",
        message: `Anda ditugaskan sebagai dosen pembimbing untuk mahasiswa ${skripsi.mahasiswa.name}.`,
        type: "PEMBIMBING_ASSIGNMENT",
        entityType: "skripsi",
        entityId: skripsi.id
      });
    }

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Dosen Pembimbing Telah Ditentukan",
      message:
        "Dosen pembimbing skripsi Anda telah ditentukan. Anda sudah dapat mengajukan bimbingan.",
      type: "PEMBIMBING_ASSIGNMENT",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.json({
      success: true,
      message: "Dosen pembimbing berhasil ditetapkan",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

export async function getBimbinganCounter(req, res, next) {
  try {
    const { id } = req.params;

    const skripsi = await prisma.skripsi.findUnique({
      where: { id },
      select: {
        id: true,
        mahasiswaId: true,
        title: true,
        tahap: true,
        status: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const validCount = await prisma.bimbinganLog.count({
      where: {
        skripsiId: id,
        status: "DIVALIDASI"
      }
    });

    return res.json({
      success: true,
      data: {
        skripsiId: id,
        validCount,
        requiredCount: 8,
        percentage: Math.min(Math.round((validCount / 8) * 100), 100),
        canRequestSidang: validCount >= 8
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSkripsiList(req, res, next) {
  try {
    const {
      status = "",
      tahap = "",
      search = "",
      page = "1",
      limit = "20"
    } = req.query;

    const roles = await getUserRoles(req.user.id);

    const currentPage = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 50);
    const skip = (currentPage - 1) * pageSize;

    const baseWhere = {
      ...(status ? { status } : {}),
      ...(tahap ? { tahap } : {}),
      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                  mode: "insensitive"
                }
              },
              {
                mahasiswa: {
                  name: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              },
              {
                mahasiswa: {
                  identifier: {
                    contains: search,
                    mode: "insensitive"
                  }
                }
              }
            ]
          }
        : {})
    };

    let accessWhere = {};

    if (roles.includes("mahasiswa")) {
      accessWhere = {
        mahasiswaId: req.user.id
      };
    } else if (
      roles.includes("dosen_pembimbing") ||
      roles.includes("dosen_penguji") ||
      roles.includes("dosen_koordinator")
    ) {
      accessWhere = {
        dosenSkripsi: {
          some: {
            dosenId: req.user.id,
            isActive: true
          }
        }
      };
    }

    if (
      roles.includes("admin") ||
      roles.includes("ketua_prodi") ||
      roles.includes("staf_prodi")
    ) {
      accessWhere = {};
    }

    const where = {
      ...baseWhere,
      ...accessWhere
    };

    const [total, data] = await prisma.$transaction([
      prisma.skripsi.count({ where }),
      prisma.skripsi.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: "desc"
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
          },
          jadwalSidang: true,
          bimbinganLogs: true,
          gamification: true
        }
      })
    ]);

    return res.json({
      success: true,
      data,
      meta: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function approveMajuSidang(req, res, next) {
  try {
    const { id } = req.params;
    const { catatan } = req.body ?? {};

    const skripsi = await prisma.skripsi.findUnique({
      where: { id },
      include: {
        mahasiswa: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const isPembimbing = await isAssignedDosenPembimbing(id, req.user.id);

    if (!isPembimbing) {
      return res.status(403).json({
        success: false,
        message: "Anda bukan dosen pembimbing aktif untuk skripsi ini"
      });
    }

    const validCount = await prisma.bimbinganLog.count({
      where: {
        skripsiId: id,
        status: "DIVALIDASI"
      }
    });

    if (validCount < 8) {
      return res.status(400).json({
        success: false,
        message: `Bimbingan valid belum mencukupi. Saat ini ${validCount}/8.`
      });
    }

    const updated = await prisma.skripsi.update({
      where: { id },
      data: {
        status: "MENUNGGU_JADWAL"
      },
      include: {
        mahasiswa: {
          select: {
            id: true,
            identifier: true,
            name: true
          }
        },
        dosenSkripsi: {
          where: {
            isActive: true
          },
          include: {
            dosen: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Disetujui Maju Sidang",
      message: "Dosen pembimbing telah menyetujui Anda untuk maju sidang.",
      type: "APPROVE_MAJU_SIDANG",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.json({
      success: true,
      message: "Mahasiswa berhasil disetujui untuk maju sidang",
      data: {
        ...updated,
        catatan
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateSkripsiStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "MENUNGGU_BERKAS",
      "MENUNGGU_APPROVAL",
      "MENUNGGU_REVISI",
      "MENUNGGU_JADWAL",
      "SIAP_SIDANG",
      "DIJADWALKAN",
      "BERLANGSUNG",
      "EVALUASI_SIDANG",
      "MENUNGGU_FINAL",
      "MENUNGGU_PENGESAHAN",
      "SELESAI",
      "DITOLAK",
      "DIBATALKAN",
      "DIARSIPKAN",
      "NONAKTIF"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status skripsi tidak valid"
      });
    }

    const skripsi = await prisma.skripsi.findUnique({
      where: { id },
      include: {
        mahasiswa: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const updated = await prisma.skripsi.update({
      where: { id },
      data: {
        status
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
        },
        berkas: true,
        kodeEtik: true
      }
    });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Status Skripsi Diperbarui",
      message: `Status skripsi Anda diperbarui menjadi ${status}.`,
      type: "SKRIPSI_STATUS",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.json({
      success: true,
      message: "Status skripsi berhasil diperbarui",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteSkripsiPermanent(req, res, next) {
  try {
    const { id } = req.params;

    const skripsi = await prisma.skripsi.findUnique({
      where: { id }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const dependency = await getSkripsiPermanentDeleteDependencies(id);

    if (dependency.total > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Skripsi tidak dapat dihapus permanen karena sudah memiliki data akademik. Gunakan Nonaktifkan/Arsipkan agar riwayat tetap aman.",
        data: dependency.details
      });
    }

    await prisma.$transaction(async (tx) => {
      await safeDeleteMany(tx.notifikasi, {
        where: {
          entityType: "skripsi",
          entityId: id
        }
      });

      await safeDeleteMany(tx.gamification, {
        where: {
          skripsiId: id
        }
      });

      await tx.skripsi.delete({
        where: { id }
      });
    });

    return res.json({
      success: true,
      message: "Skripsi berhasil dihapus permanen"
    });
  } catch (error) {
    return next(error);
  }
}

