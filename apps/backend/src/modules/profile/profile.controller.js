import { prisma } from "../../config/prisma.js";

export async function getMyProfile(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        userRoles: {
          include: {
            role: true
          }
        }
      }
    });

    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyProfile(req, res, next) {
  try {
    const { phone, address } = req.body;

    const profile = await prisma.profile.upsert({
      where: {
        userId: req.user.id
      },
      update: {
        phone,
        address
      },
      create: {
        userId: req.user.id,
        phone,
        address
      }
    });

    return res.json({
      success: true,
      message: "Profil berhasil diperbarui",
      data: profile
    });
  } catch (error) {
    return next(error);
  }
}