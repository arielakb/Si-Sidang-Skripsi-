import { prisma } from "../config/prisma.js";

const sensitiveKeys = [
  "password",
  "passwordHash",
  "accessToken",
  "refreshToken",
  "token",
  "authorization"
];

function maskSensitiveValue(key, value) {
  if (sensitiveKeys.includes(String(key).toLowerCase())) {
    return "***MASKED***";
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    return maskObject(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      item && typeof item === "object" ? maskObject(item) : item
    );
  }

  return value;
}

function maskObject(input = {}) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [
      key,
      maskSensitiveValue(key, value)
    ])
  );
}

function shouldAudit(req) {
  const method = req.method.toUpperCase();

  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return false;
  }

  if (req.path.startsWith("/api/auth/refresh")) {
    return false;
  }

  return req.path.startsWith("/api");
}

function getAction(req) {
  return `${req.method.toUpperCase()} ${req.path}`;
}

export function auditLogMiddleware(req, res, next) {
  if (!shouldAudit(req)) {
    return next();
  }

  const startedAt = Date.now();

  res.on("finish", async () => {
    try {
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id ?? null,
          method: req.method.toUpperCase(),
          path: req.originalUrl,
          action: getAction(req),
          statusCode: res.statusCode,
          ip: req.ip,
          userAgent: req.get("user-agent") ?? null,
          requestBody: maskObject(req.body ?? {}),
          params: maskObject(req.params ?? {}),
          query: maskObject(req.query ?? {})
        }
      });
    } catch (error) {
      console.error("Failed to write audit log:", error.message);
    } finally {
      const duration = Date.now() - startedAt;
      if (duration > 3000) {
        console.warn(`Slow audited request: ${req.method} ${req.originalUrl} ${duration}ms`);
      }
    }
  });

  return next();
}