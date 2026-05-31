FROM node:20-alpine AS base
WORKDIR /app

# Instalar TODAS las dependencias (incluyendo devDeps para tsx)
COPY package*.json ./
COPY packages/engine/package.json ./packages/engine/
COPY packages/api/package.json    ./packages/api/
RUN npm ci

# Copiar fuentes
COPY packages/engine/src ./packages/engine/src
COPY packages/api/src    ./packages/api/src
COPY tsconfig.base.json  ./

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npx", "tsx", "packages/api/src/index.ts"]
