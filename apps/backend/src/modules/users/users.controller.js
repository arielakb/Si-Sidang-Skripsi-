import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";

async function getUserAcademicDependencyCount(userId) {
  const [
    skripsiAsMahasiswa,
    skripsiAsDosen,
    nilaiSidang,
    berkas,
    kodeEtik
  ] = await Promise.all([
    prisma.skripsi.count({
      where: {
        mahasiswaId: userId
      }
    }),
    prisma.skripsiDosen.count({
      where: {
        OR: [
          {
            dosenId: userId
          },
          {
            assignedById: userId
          }
        ]
      }
    }),
    prisma.nilaiSidang.count({
      where: {
        dosenId: userId
      }
    }),
    prisma.berkas.count({
      where: {
        OR: [
          {
            uploadedById: userId
          },
          {
            reviewedById: userId
          }
        ]
      }
    }),
    prisma.kodeEtik.count({
      where: {
        userId
      }
    })
  ]);

  return {
    total:
      skripsiAsMahasiswa +
      skripsiAsDosen +
      nilaiSidang +
      berkas +
      kodeEtik,
    details: {
      skripsiAsMahasiswa,
      skripsiAsDosen,
      nilaiSidang,
      berkas,
      kodeEtik
    }
  };
}

export async function getUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        identifier: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        profile: true,
        userRoles: {
          include: {
            role: true
          }
        }
      },
      orderBy: [
        {
          status: "asc"
        },
        {
          createdAt: "desc"
        }
      ]
    });

    return res.json({
      success: true,
      data: users
    });
  } catch (error) {
    return next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const { identifier, name, email, password, roleSlugs = [] } = req.body;

    if (!identifier || !name || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifier, nama, dan password wajib diisi"
      });
    }

    const passwordHash = await bcrypt.hash(
      password,
      env.security.bcryptSaltRounds
    );

    const roles = await prisma.role.findMany({
      where: {
        slug: {
          in: roleSlugs
        }
      }
    });

    const user = await prisma.user.create({
      data: {
        identifier,
        name,
        email: email || null,
        passwordHash,
        status: "ACTIVE",
        profile: {
          create: {}
        },
        userRoles: {
          create: roles.map((role) => ({
            roleId: role.id
          }))
        }
      },
      select: {
        id: true,
        identifier: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: "User berhasil dibuat",
      data: user
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message:
          "Identifier atau email sudah digunakan. Jika user sudah nonaktif, aktifkan kembali user lama."
      });
    }

    return next(error);
  }
}

export async function assignRoles(req, res, next) {
  try {
    const { id } = req.params;
    const { roleSlugs = [] } = req.body;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    const roles = await prisma.role.findMany({
      where: {
        slug: {
          in: roleSlugs
        }
      }
    });

    await prisma.$transaction([
      prisma.userRole.deleteMany({
        where: { userId: id }
      }),
      prisma.userRole.createMany({
        data: roles.map((role) => ({
          userId: id,
          roleId: role.id
        })),
        skipDuplicates: true
      })
    ]);

    return res.json({
      success: true,
      message: "Role user berhasil diperbarui"
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status tidak valid"
      });
    }

    if (id === req.user.id && status === "INACTIVE") {
      return res.status(400).json({
        success: false,
        message: "Anda tidak dapat menonaktifkan akun sendiri"
      });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        identifier: true,
        name: true,
        email: true,
        status: true
      }
    });

    return res.json({
      success: true,
      message: "Status user berhasil diperbarui",
      data: user
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteUserPermanent(req, res, next) {
  try {
    const { id } = req.params;

    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "Anda tidak dapat menghapus permanen akun sendiri"
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    const roleSlugs = user.userRoles.map((item) => item.role.slug);
    const isAdmin = roleSlugs.includes("admin");

    if (isAdmin && user.status === "ACTIVE") {
      const activeAdminCount = await prisma.user.count({
        where: {
          status: "ACTIVE",
          userRoles: {
            some: {
              role: {
                slug: "admin"
              }
            }
          }
        }
      });

      if (activeAdminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: "Tidak dapat menghapus admin aktif terakhir"
        });
      }
    }

    const dependency = await getUserAcademicDependencyCount(id);

    if (dependency.total > 0) {
      return res.status(409).json({
        success: false,
        message:
          "User tidak dapat dihapus permanen karena sudah memiliki data akademik. Gunakan Nonaktifkan agar riwayat tetap aman.",
        data: dependency.details
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: {
          userId: id
        }
      });

      if (tx.notifikasi?.deleteMany) {
        await tx.notifikasi.deleteMany({
          where: {
            userId: id
          }
        });
      }

      if (tx.profile?.deleteMany) {
        await tx.profile.deleteMany({
          where: {
            userId: id
          }
        });
      }

      await tx.user.delete({
        where: {
          id
        }
      });
    });

    return res.json({
      success: true,
      message: "User berhasil dihapus permanen"
    });
  } catch (error) {
    return next(error);
  }
}