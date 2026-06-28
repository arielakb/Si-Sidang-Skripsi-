import { prisma } from "../../config/prisma.js";

export async function getMyNotifications(req, res, next) {
  try {
    const {
      page = "1",
      limit = "10",
      status = ""
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 50);
    const skip = (currentPage - 1) * pageSize;

    const where = {
      userId: req.user.id,
      ...(status ? { status } : {})
    };

    const [total, unreadCount, data] = await prisma.$transaction([
      prisma.notifikasi.count({ where }),
      prisma.notifikasi.count({
        where: {
          userId: req.user.id,
          status: "UNREAD"
        }
      }),
      prisma.notifikasi.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: "desc"
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
        totalPages: Math.ceil(total / pageSize),
        unreadCount
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function getUnreadCount(req, res, next) {
  try {
    const count = await prisma.notifikasi.count({
      where: {
        userId: req.user.id,
        status: "UNREAD"
      }
    });

    return res.json({
      success: true,
      data: {
        unreadCount: count
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function markNotificationAsRead(req, res, next) {
  try {
    const { id } = req.params;

    const notification = await prisma.notifikasi.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notifikasi tidak ditemukan"
      });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses ke notifikasi ini"
      });
    }

    const updated = await prisma.notifikasi.update({
      where: { id },
      data: {
        status: "READ",
        readAt: new Date()
      }
    });

    return res.json({
      success: true,
      message: "Notifikasi ditandai sudah dibaca",
      data: updated
    });
  } catch (error) {
    return next(error);
  }
}

export async function markAllNotificationsAsRead(req, res, next) {
  try {
    const result = await prisma.notifikasi.updateMany({
      where: {
        userId: req.user.id,
        status: "UNREAD"
      },
      data: {
        status: "READ",
        readAt: new Date()
      }
    });

    return res.json({
      success: true,
      message: "Semua notifikasi ditandai sudah dibaca",
      data: {
        updatedCount: result.count
      }
    });
  } catch (error) {
    return next(error);
  }
}