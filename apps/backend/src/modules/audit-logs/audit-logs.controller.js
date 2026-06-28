import { prisma } from "../../config/prisma.js";

export async function getAuditLogs(req, res, next) {
  try {
    const {
      page = "1",
      limit = "20",
      method = "",
      userId = "",
      search = ""
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const pageSize = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (currentPage - 1) * pageSize;

    const where = {
      ...(method ? { method } : {}),
      ...(userId ? { userId } : {}),
      ...(search
        ? {
            OR: [
              {
                path: {
                  contains: search,
                  mode: "insensitive"
                }
              },
              {
                action: {
                  contains: search,
                  mode: "insensitive"
                }
              }
            ]
          }
        : {})
    };

    const [total, data] = await prisma.$transaction([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: {
          createdAt: "desc"
        },
        include: {
          user: {
            select: {
              id: true,
              identifier: true,
              name: true,
              email: true
            }
          }
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