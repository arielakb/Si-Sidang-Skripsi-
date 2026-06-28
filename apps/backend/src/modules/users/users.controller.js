import bcrypt from "bcrypt";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";

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
      orderBy: {
        createdAt: "desc"
      }
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
        email,
        passwordHash,
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
        message: "Identifier atau email sudah digunakan"
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