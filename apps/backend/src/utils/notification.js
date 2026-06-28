import { prisma } from "../config/prisma.js";

export async function createNotification({
  userId,
  title,
  message,
  type,
  entityType,
  entityId
}) {
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