import fs from "fs/promises";
import { prisma } from "../../config/prisma.js";

const SEMINAR_REQUIRED_BERKAS = ["PROPOSAL", "PRESENTASI"];

async function removePhysicalFile(filePath) {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.warn("Gagal menghapus file fisik:", filePath, error.message);
    }
  }
}

async function syncSeminarProposalStatus(skripsiId) {
  const skripsi = await prisma.skripsi.findUnique({
    where: {
      id: skripsiId
    },
    include: {
      berkas: {
        where: {
          kategori: {
            in: SEMINAR_REQUIRED_BERKAS
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      kodeEtik: true
    }
  });

  if (!skripsi) return null;

  if (skripsi.tahap !== "SEMINAR_PROPOSAL") {
    return skripsi;
  }

  const hasProposal = skripsi.berkas.some(
    (item) => item.kategori === "PROPOSAL"
  );

  const hasPresentasi = skripsi.berkas.some(
    (item) => item.kategori === "PRESENTASI"
  );

  const hasKodeEtik = skripsi.kodeEtik.length > 0;

  const nextStatus =
    hasProposal && hasPresentasi && hasKodeEtik
      ? "MENUNGGU_APPROVAL"
      : "MENUNGGU_BERKAS";

  const syncableStatuses = [
    "MENUNGGU_BERKAS",
    "MENUNGGU_APPROVAL",
    "MENUNGGU_REVISI"
  ];

  if (!syncableStatuses.includes(skripsi.status)) {
    return skripsi;
  }

  if (skripsi.status === nextStatus) {
    return skripsi;
  }

  return prisma.skripsi.update({
    where: {
      id: skripsiId
    },
    data: {
      status: nextStatus
    }
  });
}

async function upsertSeminarBerkas({
  skripsiId,
  kategori,
  file,
  uploadedById
}) {
  const existing = await prisma.berkas.findFirst({
    where: {
      skripsiId,
      kategori
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  const duplicateFiles = await prisma.berkas.findMany({
    where: {
      skripsiId,
      kategori,
      ...(existing
        ? {
            id: {
              not: existing.id
            }
          }
        : {})
    }
  });

  for (const duplicate of duplicateFiles) {
    await removePhysicalFile(duplicate.path);

    await prisma.berkas.delete({
      where: {
        id: duplicate.id
      }
    });
  }

  const filePayload = getUploadedFilePayload(file);

  if (existing) {
    await removePhysicalFile(existing.path);

    return prisma.berkas.update({
      where: {
        id: existing.id
      },
      data: {
        uploadedById,
        kategori,
        status: "DIAJUKAN",
        reviewedById: null,
        reviewedAt: null,
        catatan: null,
        ...filePayload
      }
    });
  }

  return prisma.berkas.create({
    data: {
      skripsiId,
      uploadedById,
      kategori,
      status: "DIAJUKAN",
      ...filePayload
    }
  });
}

function getUploadedFilePayload(file) {
  return {
    originalName: file.originalname,
    fileName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: BigInt(file.size),
    path: file.path
  };
}

async function createNotification({ userId, title, message, type, entityType, entityId }) {
  return prisma.notifikasi.create({
    data: {
      userId,
      title,
      message,
      type,
      entityType,
      entityId
    }
  });
}

async function ensureSkripsiOwner(skripsiId, userId) {
  const skripsi = await prisma.skripsi.findUnique({
    where: { id: skripsiId }
  });

  if (!skripsi) {
    return { error: "NOT_FOUND" };
  }

  if (skripsi.mahasiswaId !== userId) {
    return { error: "FORBIDDEN" };
  }

  return { skripsi };
}

export async function registerSeminarProposal(req, res, next) {
  try {
    const { title, abstract, peminatanId, jenisSkripsiId } = req.body;

    if (!title || !peminatanId) {
      return res.status(400).json({
        success: false,
        message: "Judul dan peminatan wajib diisi"
      });
    }

    const existingActiveSkripsi = await prisma.skripsi.findFirst({
      where: {
        mahasiswaId: req.user.id,
        status: {
          notIn: ["SELESAI", "DITOLAK"]
        }
      }
    });

    if (existingActiveSkripsi) {
      return res.status(409).json({
        success: false,
        message: "Mahasiswa masih memiliki proses skripsi aktif"
      });
    }

    const jenisSkripsi =
      jenisSkripsiId
        ? await prisma.jenisSkripsi.findUnique({ where: { id: jenisSkripsiId } })
        : await prisma.jenisSkripsi.findUnique({ where: { slug: "seminar_proposal" } });

    if (!jenisSkripsi) {
      return res.status(404).json({
        success: false,
        message: "Jenis skripsi seminar proposal tidak ditemukan"
      });
    }

    const peminatan = await prisma.peminatan.findUnique({
      where: { id: peminatanId }
    });

    if (!peminatan) {
      return res.status(404).json({
        success: false,
        message: "Peminatan tidak ditemukan"
      });
    }

    const skripsi = await prisma.$transaction(async (tx) => {
      const createdSkripsi = await tx.skripsi.create({
        data: {
          mahasiswaId: req.user.id,
          peminatanId,
          jenisSkripsiId: jenisSkripsi.id,
          title,
          abstract,
          tahap: "SEMINAR_PROPOSAL",
          status: "MENUNGGU_BERKAS",
          gamification: {
            create: {
              progressPercent: 10,
              points: 10
            }
          }
        },
        include: {
          mahasiswa: {
            select: {
              id: true,
              identifier: true,
              name: true
            }
          },
          peminatan: true,
          jenisSkripsi: true
        }
      });

      await tx.sidang.create({
        data: {
          skripsiId: createdSkripsi.id,
          jenis: "SEMINAR_PROPOSAL",
          attemptNo: 1,
          status: "MENUNGGU_BERKAS",
          createdById: req.user.id
        }
      });

      return createdSkripsi;
    });

    return res.status(201).json({
      success: true,
      message: "Pendaftaran seminar proposal berhasil dibuat",
      data: skripsi
    });
  } catch (error) {
    return next(error);
  }
}

export async function getMySeminarProposal(req, res, next) {
  try {
    const data = await prisma.skripsi.findMany({
      where: {
        mahasiswaId: req.user.id,
        tahap: "SEMINAR_PROPOSAL"
      },
      include: {
        peminatan: true,
        jenisSkripsi: true,
        berkas: true,
        kodeEtik: true,
        dosenSkripsi: {
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
        suratPerjanjian: {
          include: {
            berkas: true
          }
        }
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

export async function getSeminarProposalDetail(req, res, next) {
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
        berkas: true,
        kodeEtik: true,
        dosenSkripsi: {
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
        suratPerjanjian: {
          include: {
            berkas: true
          }
        }
      }
    });

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Seminar proposal tidak ditemukan"
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

export async function uploadProposalFile(req, res, next) {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File proposal wajib diupload"
      });
    }

    const { error, skripsi } = await ensureSkripsiOwner(id, req.user.id);

    if (error === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    if (error === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke skripsi ini"
      });
    }

    if (!["MENUNGGU_BERKAS", "MENUNGGU_APPROVAL"].includes(skripsi.status)) {
      return res.status(400).json({
        success: false,
        message: "Proposal tidak dapat diubah pada status skripsi saat ini"
      });
    }

    const berkas = await upsertSeminarBerkas({
      skripsiId: skripsi.id,
      kategori: "PROPOSAL",
      file: req.file,
      uploadedById: req.user.id
    });

    await syncSeminarProposalStatus(skripsi.id);

    return res.status(201).json({
      success: true,
      message: "File proposal berhasil diupload",
      data: berkas
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadPresentationFile(req, res, next) {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File presentasi wajib diupload"
      });
    }

    const { error, skripsi } = await ensureSkripsiOwner(id, req.user.id);

    if (error === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    if (error === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke skripsi ini"
      });
    }

    if (!["MENUNGGU_BERKAS", "MENUNGGU_APPROVAL"].includes(skripsi.status)) {
      return res.status(400).json({
        success: false,
        message: "Presentasi tidak dapat diubah pada status skripsi saat ini"
      });
    }

    const berkas = await upsertSeminarBerkas({
      skripsiId: skripsi.id,
      kategori: "PRESENTASI",
      file: req.file,
      uploadedById: req.user.id
    });

    await syncSeminarProposalStatus(skripsi.id);

    return res.status(201).json({
      success: true,
      message: "File presentasi berhasil diupload",
      data: berkas
    });
  } catch (error) {
    return next(error);
  }
}

export async function agreeKodeEtik(req, res, next) {
  try {
    const { id } = req.params;
    const { statementVersion = "v1.0.0" } = req.body;

    const { error, skripsi } = await ensureSkripsiOwner(id, req.user.id);

    if (error === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    if (error === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke skripsi ini"
      });
    }

    const existingKodeEtik = await prisma.kodeEtik.findFirst({
      where: {
        skripsiId: skripsi.id,
        userId: req.user.id
      },
      orderBy: {
        agreedAt: "desc"
      }
    });

    const kodeEtik =
      existingKodeEtik ||
      (await prisma.kodeEtik.create({
        data: {
          skripsiId: skripsi.id,
          userId: req.user.id,
          statementVersion,
          agreedAt: new Date()
        }
      }));

    const updatedSkripsi = await syncSeminarProposalStatus(skripsi.id);

    return res.status(existingKodeEtik ? 200 : 201).json({
      success: true,
      message: "Kode etik berhasil disetujui",
      data: {
        kodeEtik,
        skripsi: updatedSkripsi
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteSeminarBerkas(req, res, next) {
  try {
    const { id } = req.params;
    const kategori = String(req.params.kategori || "").toUpperCase();

    if (!["PROPOSAL", "PRESENTASI"].includes(kategori)) {
      return res.status(400).json({
        success: false,
        message: "Kategori berkas tidak valid"
      });
    }

    const { error, skripsi } = await ensureSkripsiOwner(id, req.user.id);

    if (error === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    if (error === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke skripsi ini"
      });
    }

    if (!["MENUNGGU_BERKAS", "MENUNGGU_APPROVAL"].includes(skripsi.status)) {
      return res.status(400).json({
        success: false,
        message: "Berkas tidak dapat dihapus pada status skripsi saat ini"
      });
    }

    const berkas = await prisma.berkas.findFirst({
      where: {
        skripsiId: skripsi.id,
        kategori
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    if (!berkas) {
      return res.status(404).json({
        success: false,
        message: "Berkas tidak ditemukan"
      });
    }

    await removePhysicalFile(berkas.path);

    await prisma.berkas.delete({
      where: {
        id: berkas.id
      }
    });

    await syncSeminarProposalStatus(skripsi.id);

    return res.json({
      success: true,
      message: "Berkas berhasil dihapus"
    });
  } catch (error) {
    return next(error);
  }
}

export async function assignPenguji(req, res, next) {
  try {
    const { id } = req.params;
    const { dosenIds = [] } = req.body;

    if (!Array.isArray(dosenIds) || dosenIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Minimal satu dosen penguji wajib dipilih"
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

    const dosenUsers = await prisma.user.findMany({
      where: {
        id: {
          in: dosenIds
        },
        status: "ACTIVE",
        userRoles: {
          some: {
            role: {
              slug: {
                in: ["dosen_penguji", "dosen_pembimbing", "dosen_koordinator"]
              }
            }
          }
        }
      }
    });

    if (dosenUsers.length !== dosenIds.length) {
      return res.status(400).json({
        success: false,
        message: "Sebagian dosen tidak valid atau tidak memiliki role dosen"
      });
    }

    await prisma.$transaction([
      prisma.skripsiDosen.deleteMany({
        where: {
          skripsiId: id,
          peran: "PENGUJI"
        }
      }),
      prisma.skripsiDosen.createMany({
        data: dosenUsers.map((dosen) => ({
          skripsiId: id,
          dosenId: dosen.id,
          peran: "PENGUJI",
          assignedById: req.user.id
        })),
        skipDuplicates: true
      })
    ]);

    for (const dosen of dosenUsers) {
      await createNotification({
        userId: dosen.id,
        title: "Penugasan Penguji Seminar Proposal",
        message: `Anda ditugaskan sebagai penguji seminar proposal untuk mahasiswa ${skripsi.mahasiswa.name}.`,
        type: "SEMINAR_ASSIGNMENT",
        entityType: "skripsi",
        entityId: skripsi.id
      });
    }

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Dosen Penguji Telah Ditentukan",
      message: "Dosen penguji seminar proposal Anda telah ditentukan oleh koordinator.",
      type: "SEMINAR_ASSIGNMENT",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.json({
      success: true,
      message: "Dosen penguji berhasil ditetapkan"
    });
  } catch (error) {
    return next(error);
  }
}

export async function getKompreSkripsiList(req, res, next) {
  try {
    const data = await prisma.skripsi.findMany({
      where: {
        tahap: "KOMPRE",
        status: {
          notIn: ["SELESAI", "DITOLAK"]
        }
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

export async function getDosenPembimbingOptions(req, res, next) {
  try {
    const data = await prisma.user.findMany({
      where: {
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
        identifier: true,
        name: true,
        email: true
      },
      orderBy: {
        name: "asc"
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

export async function assignPembimbing(req, res, next) {
  try {
    const { id } = req.params;
    const { dosenId } = req.body;

    if (!dosenId) {
      return res.status(400).json({
        success: false,
        message: "Dosen pembimbing wajib dipilih"
      });
    }

    const skripsi = await prisma.skripsi.findUnique({
      where: {
        id
      },
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

    if (skripsi.tahap !== "KOMPRE") {
      return res.status(400).json({
        success: false,
        message: "Dosen pembimbing hanya dapat ditetapkan setelah seminar proposal disetujui"
      });
    }

    const dosen = await prisma.user.findFirst({
      where: {
        id: dosenId,
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
      }
    });

    if (!dosen) {
      return res.status(400).json({
        success: false,
        message: "Dosen pembimbing tidak valid"
      });
    }

    await prisma.$transaction([
      prisma.skripsiDosen.deleteMany({
        where: {
          skripsiId: id,
          peran: "PEMBIMBING"
        }
      }),
      prisma.skripsiDosen.create({
        data: {
          skripsiId: id,
          dosenId,
          peran: "PEMBIMBING",
          assignedById: req.user.id
        }
      })
    ]);

    await createNotification({
      userId: dosen.id,
      title: "Penugasan Dosen Pembimbing",
      message: `Anda ditugaskan sebagai dosen pembimbing untuk mahasiswa ${skripsi.mahasiswa.name}.`,
      type: "SKRIPSI_ASSIGNMENT",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Dosen Pembimbing Telah Ditentukan",
      message: `Dosen pembimbing Anda adalah ${dosen.name}.`,
      type: "SKRIPSI_ASSIGNMENT",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.json({
      success: true,
      message: "Dosen pembimbing berhasil ditetapkan"
    });
  } catch (error) {
    return next(error);
  }
}

export async function reviewSeminarProposal(req, res, next) {
  try {
    const { id } = req.params;
    const { decision, catatan } = req.body;

    if (!["APPROVE", "REVISI", "TOLAK"].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision harus APPROVE, REVISI, atau TOLAK"
      });
    }

    const skripsi = await prisma.skripsi.findUnique({
      where: { id },
      include: {
        mahasiswa: true,
        berkas: true,
        dosenSkripsi: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const currentUser = await prisma.user.findUnique({
      where: {
        id: req.user.id
      },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    const roleSlugs =
      currentUser?.userRoles.map((item) => item.role.slug) ?? [];

    const canReviewByRole = roleSlugs.some((role) =>
      ["admin", "dosen_koordinator", "ketua_prodi"].includes(role)
    );

    const isAssignedPenguji = skripsi.dosenSkripsi.some(
      (item) =>
        item.dosenId === req.user.id &&
        item.peran === "PENGUJI" &&
        item.isActive
    );

    if (!canReviewByRole && !isAssignedPenguji) {
      return res.status(403).json({
        success: false,
        message:
          "Anda tidak memiliki akses untuk review seminar proposal ini"
      });
    }

    if (!["MENUNGGU_APPROVAL", "MENUNGGU_REVISI"].includes(skripsi.status)) {
      return res.status(400).json({
        success: false,
        message: `Seminar proposal tidak dapat direview pada status ${skripsi.status}`
      });
    }

    let nextStatus = skripsi.status;
    let nextTahap = skripsi.tahap;
    let seminarApprovedAt = skripsi.seminarApprovedAt;

    if (decision === "APPROVE") {
      nextStatus = "MENUNGGU_BERKAS";
      nextTahap = "KOMPRE";
      seminarApprovedAt = new Date();
    }

    if (decision === "REVISI") {
      nextStatus = "MENUNGGU_REVISI";
    }

    if (decision === "TOLAK") {
      nextStatus = "DITOLAK";
    }

    await prisma.$transaction([
      prisma.berkas.updateMany({
        where: {
          skripsiId: skripsi.id,
          kategori: {
            in: ["PROPOSAL", "PRESENTASI", "SEMINAR_REVISI"]
          }
        },
        data: {
          status:
            decision === "APPROVE"
              ? "DISETUJUI"
              : decision === "REVISI"
                ? "REVISI"
                : "DITOLAK",
          reviewedById: req.user.id,
          reviewedAt: new Date(),
          catatan
        }
      }),

      prisma.skripsi.update({
        where: {
          id: skripsi.id
        },
        data: {
          status: nextStatus,
          tahap: nextTahap,
          seminarApprovedAt
        }
      })
    ]);

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Review Seminar Proposal",
      message:
        decision === "APPROVE"
          ? "Seminar proposal Anda telah disetujui. Anda dapat lanjut ke tahap kompre."
          : decision === "REVISI"
            ? "Seminar proposal Anda membutuhkan revisi."
            : "Seminar proposal Anda ditolak.",
      type: "SEMINAR_REVIEW",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.json({
      success: true,
      message: "Review seminar proposal berhasil disimpan",
      data: {
        id: skripsi.id,
        decision,
        status: nextStatus,
        tahap: nextTahap,
        seminarApprovedAt
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadSeminarRevision(req, res, next) {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File revisi wajib diupload"
      });
    }

    const { error, skripsi } = await ensureSkripsiOwner(id, req.user.id);

    if (error === "NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    if (error === "FORBIDDEN") {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke skripsi ini"
      });
    }

    const filePayload = getUploadedFilePayload(req.file);

    const berkas = await prisma.berkas.create({
      data: {
        skripsiId: skripsi.id,
        uploadedById: req.user.id,
        kategori: "SEMINAR_REVISI",
        status: "DIAJUKAN",
        ...filePayload
      }
    });

    await prisma.skripsi.update({
      where: { id: skripsi.id },
      data: {
        status: "MENUNGGU_APPROVAL"
      }
    });

    return res.status(201).json({
      success: true,
      message: "Revisi seminar proposal berhasil diupload",
      data: berkas
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadSuratPerjanjian(req, res, next) {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File surat perjanjian wajib diupload"
      });
    }

    const skripsi = await prisma.skripsi.findUnique({
      where: { id },
      include: {
        mahasiswa: true,
        dosenSkripsi: true
      }
    });

    if (!skripsi) {
      return res.status(404).json({
        success: false,
        message: "Skripsi tidak ditemukan"
      });
    }

    const isAssignedPenguji = skripsi.dosenSkripsi.some(
      (item) =>
        item.dosenId === req.user.id &&
        item.peran === "PENGUJI" &&
        item.isActive
    );

    if (!isAssignedPenguji) {
      return res.status(403).json({
        success: false,
        message: "Anda bukan dosen penguji untuk seminar proposal ini"
      });
    }

    const filePayload = getUploadedFilePayload(req.file);

    const result = await prisma.$transaction(async (tx) => {
      const berkas = await tx.berkas.create({
        data: {
          skripsiId: skripsi.id,
          uploadedById: req.user.id,
          kategori: "SURAT_PERJANJIAN",
          status: "DISETUJUI",
          ...filePayload
        }
      });

      const surat = await tx.suratPerjanjian.create({
        data: {
          skripsiId: skripsi.id,
          berkasId: berkas.id,
          uploadedById: req.user.id
        }
      });

      return { berkas, surat };
    });

    await createNotification({
      userId: skripsi.mahasiswaId,
      title: "Surat Perjanjian Tersedia",
      message: "Surat perjanjian seminar proposal Anda telah diupload.",
      type: "SURAT_PERJANJIAN",
      entityType: "skripsi",
      entityId: skripsi.id
    });

    return res.status(201).json({
      success: true,
      message: "Surat perjanjian berhasil diupload",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}
export async function getSeminarProposalList(req, res, next) {
  try {
    const { status = "", search = "" } = req.query;

    const data = await prisma.skripsi.findMany({
      where: {
        tahap: "SEMINAR_PROPOSAL",
        ...(status ? { status } : {}),
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
        berkas: {
          orderBy: {
            createdAt: "desc"
          }
        },
        kodeEtik: true,
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