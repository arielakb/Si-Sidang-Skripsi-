import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan"
      });
    }

    const token = authHeader.replace("Bearer ", "");

    let payload;

    try {
      payload = jwt.verify(token, env.jwt.accessSecret);
    } catch {
      return res.status(401).json({
        success: false,
        message: "Token tidak valid atau sudah expired"
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: payload.sub
      }
    });

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({
        success: false,
        message: "User tidak valid"
      });
    }

    req.user = {
      id: user.id,
      identifier: user.identifier,
      name: user.name,
      email: user.email
    };

    return next();
  } catch (error) {
    return next(error);
  }
}