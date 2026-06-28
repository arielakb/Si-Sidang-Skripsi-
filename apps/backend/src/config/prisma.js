import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: env.app.environment === "development"
      ? ["query", "info", "warn", "error"]
      : ["warn", "error"]
  });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (env.app.environment !== "production") {
  globalThis.prisma = prisma;
}