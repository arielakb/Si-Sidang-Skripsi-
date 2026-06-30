import { prisma } from "../../config/prisma.js";

function normalizeNotification(notification) {
  const isRead = notification.status === "READ";

  return {
    ...notification,
    isRead,
    body: notification.message,
    actionUrl: notification.actionUrl ?? null,
    data: notification.data ?? null
  };
}

function normalizeStatusFilter(status) {
  const normalized = String(status || "").trim().toUpperCase();

  if (["READ", "UNREAD"].includes(normalized)) {
    return normalized;
  }

  return "";
}

export async function getMyNotifications(req, res, next) {
  try {
    const { page = "1", limit = "10", status = "" } = req.query;

    const currentPage = Math.max(Number(page) || 1, 1);
    const pageSize = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const skip = (currentPage - 1) * pageSize;
    const statusFilter = normalizeStatusFilter(status);

    const where = {
      userId: req.user.id,
      ...(statusFilter ? { status: statusFilter } : {})
    };

    const [total, unreadCount, notifications] = await prisma.$transaction([
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
      data: notifications.map(normalizeNotification),
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
        readAt: notification.readAt ?? new Date()
      }
    });

    const unreadCount = await prisma.notifikasi.count({
      where: {
        userId: req.user.id,
        status: "UNREAD"
      }
    });

    return res.json({
      success: true,
      message: "Notifikasi ditandai sudah dibaca",
      data: normalizeNotification(updated),
      meta: {
        unreadCount
      }
    });
  } catch (error) {
    return next(error);
  }
}

export async function markAllNotificationsAsRead(req, res, next) {
  try {
    const now = new Date();

    const result = await prisma.notifikasi.updateMany({
      where: {
        userId: req.user.id,
        status: "UNREAD"
      },
      data: {
        status: "READ",
        readAt: now
      }
    });

    return res.json({
      success: true,
      message: "Semua notifikasi ditandai sudah dibaca",
      data: {
        updatedCount: result.count
      },
      meta: {
        unreadCount: 0
      }
    });
  } catch (error) {
    return next(error);
  }
}
