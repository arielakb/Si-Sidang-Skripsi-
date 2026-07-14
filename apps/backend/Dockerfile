FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY apps/backend/package*.json ./
COPY apps/backend/prisma ./prisma

RUN npm install

COPY apps/backend ./

EXPOSE 5000

CMD ["npm", "run", "dev"]