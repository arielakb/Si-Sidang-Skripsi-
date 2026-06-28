import { prisma } from "../../config/prisma.js";

export async function getHealth(req, res, next) {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return res.json({
      success: true,
      status: "ok",
      service: "sisidang-backend",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      status: "error",
      service: "sisidang-backend",
      database: "disconnected",
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}