# Sisidang — Sistem Administrasi Skripsi Universitas Pancasila

## Stack

- Backend: Node.js, Express, Prisma
- Frontend: React, Vite, TypeScript
- Database: PostgreSQL
- Auth: JWT access token + refresh token HTTP-only cookie
- Upload: local storage
- Container: Docker Compose

## Menjalankan Project

```powershell
cp .env.example .env
cp apps/frontend/.env.example apps/frontend/.env

docker compose up -d --build