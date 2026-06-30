import dotenv from "dotenv";

dotenv.config();

const requiredEnv = [
  "BACKEND_PORT",
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_ACCESS_EXPIRES_IN",
  "JWT_REFRESH_EXPIRES_IN",
  "UPLOAD_DIR",
  "MAX_FILE_SIZE_MB",
  "CORS_ORIGIN",
  "REFRESH_TOKEN_COOKIE_NAME"
];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  app: {
    name: process.env.APP_NAME || "Sisidang",
    environment: process.env.APP_ENV || "development"
  },
  server: {
    port: Number(process.env.BACKEND_PORT),
    corsOrigin: process.env.CORS_ORIGIN
  },
  database: {
    url: process.env.DATABASE_URL
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN
  },
  upload: {
    dir: process.env.UPLOAD_DIR,
    maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB)
  },
  security: {
    bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 12),
    rateLimitWindowMinutes: Number(
      process.env.RATE_LIMIT_WINDOW_MINUTES ||
        (process.env.NODE_ENV === "production" ? 15 : 1)
    ),
    rateLimitMaxRequests: Number(
      process.env.RATE_LIMIT_MAX_REQUESTS ||
        (process.env.NODE_ENV === "production" ? 100 : 10000)
    )
  },
  cookie: {
  secure: process.env.COOKIE_SECURE === "true",
  sameSite: process.env.COOKIE_SAME_SITE || "lax",
  refreshTokenCookieName: process.env.REFRESH_TOKEN_COOKIE_NAME
  }
};