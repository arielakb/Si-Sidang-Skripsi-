import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../../config/prisma.js";
import { env } from "../../config/env.js";
import { getUserPermissions, getUserRoles } from "../rbac/rbac.service.js";

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      identifier: user.identifier
    },
    env.jwt.accessSecret,
    {
      expiresIn: env.jwt.accessExpiresIn
    }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      identifier: user.identifier,
      tokenType: "refresh"
    },
    env.jwt.refreshSecret,
    {
      expiresIn: env.jwt.refreshExpiresIn
    }
  );
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getRefreshTokenExpiryDate() {
  const now = new Date();

  const expiresIn = env.jwt.refreshExpiresIn;

  if (expiresIn.endsWith("d")) {
    const days = Number(expiresIn.replace("d", ""));
    now.setDate(now.getDate() + days);
    return now;
  }

  if (expiresIn.endsWith("h")) {
    const hours = Number(expiresIn.replace("h", ""));
    now.setHours(now.getHours() + hours);
    return now;
  }

  now.setDate(now.getDate() + 7);
  return now;
}

export async function loginUser({ identifier, password, userAgent, ipAddress }) {
  const user = await prisma.user.findUnique({
    where: { identifier },
    include: {
      profile: true
    }
  });

  if (!user) {
    return null;
  }

  if (user.status !== "ACTIVE") {
    throw new Error("USER_INACTIVE");
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);

  if (!passwordValid) {
    return null;
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      userAgent,
      ipAddress,
      expiresAt: getRefreshTokenExpiryDate()
    }
  });

  const roles = await getUserRoles(user.id);
  const permissions = await getUserPermissions(user.id);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      identifier: user.identifier,
      name: user.name,
      email: user.email,
      status: user.status,
      roles,
      permissions,
      profile: user.profile
    }
  };
}

export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    return null;
  }

  let payload;

  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    return null;
  }

  if (payload.tokenType !== "refresh") {
    return null;
  }

  const tokenHash = hashToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          profile: true
        }
      }
    }
  });

  if (!storedToken) {
    return null;
  }

  if (storedToken.revokedAt) {
    return null;
  }

  if (storedToken.expiresAt < new Date()) {
    return null;
  }

  if (storedToken.user.status !== "ACTIVE") {
    return null;
  }

  const accessToken = signAccessToken(storedToken.user);
  const roles = await getUserRoles(storedToken.user.id);
  const permissions = await getUserPermissions(storedToken.user.id);

  return {
    accessToken,
    user: {
      id: storedToken.user.id,
      identifier: storedToken.user.identifier,
      name: storedToken.user.name,
      email: storedToken.user.email,
      status: storedToken.user.status,
      roles,
      permissions,
      profile: storedToken.user.profile
    }
  };
}

export async function logoutUser(refreshToken) {
  if (!refreshToken) {
    return;
  }

  const tokenHash = hashToken(refreshToken);

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null
    },
    data: {
      revokedAt: new Date()
    }
  });
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true
    }
  });

  if (!user) {
    return null;
  }

  const roles = await getUserRoles(user.id);
  const permissions = await getUserPermissions(user.id);

  return {
    id: user.id,
    identifier: user.identifier,
    name: user.name,
    email: user.email,
    status: user.status,
    roles,
    permissions,
    profile: user.profile
  };
}