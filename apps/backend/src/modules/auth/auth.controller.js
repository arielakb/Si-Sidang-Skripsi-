import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken
} from "./auth.service.js";
import { env } from "../../config/env.js";

function setRefreshTokenCookie(res, refreshToken) {
  res.cookie(env.cookie.refreshTokenCookieName, refreshToken, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: "/api/auth",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearRefreshTokenCookie(res) {
  res.clearCookie(env.cookie.refreshTokenCookieName, {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: "/api/auth"
  });
}

export async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifier dan password wajib diisi"
      });
    }

    const result = await loginUser({
      identifier,
      password,
      userAgent: req.headers["user-agent"],
      ipAddress: req.ip
    });

    if (!result) {
      return res.status(401).json({
        success: false,
        message: "Identifier atau password salah"
      });
    }

    setRefreshTokenCookie(res, result.refreshToken);

    return res.json({
      success: true,
      message: "Login berhasil",
      data: {
        accessToken: result.accessToken,
        user: result.user
      }
    });
  } catch (error) {
    if (error.message === "USER_INACTIVE") {
      return res.status(403).json({
        success: false,
        message: "User tidak aktif"
      });
    }

    return next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = req.cookies?.[env.cookie.refreshTokenCookieName];

    const result = await refreshAccessToken(refreshToken);

    if (!result) {
      clearRefreshTokenCookie(res);

      return res.status(401).json({
        success: false,
        message: "Refresh token tidak valid"
      });
    }

    return res.json({
      success: true,
      message: "Token berhasil diperbarui",
      data: result
    });
  } catch (error) {
    return next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies?.[env.cookie.refreshTokenCookieName];

    await logoutUser(refreshToken);
    clearRefreshTokenCookie(res);

    return res.json({
      success: true,
      message: "Logout berhasil"
    });
  } catch (error) {
    return next(error);
  }
}

export async function me(req, res, next) {
  try {
    const user = await getCurrentUser(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan"
      });
    }

    return res.json({
      success: true,
      data: user
    });
  } catch (error) {
    return next(error);
  }
}