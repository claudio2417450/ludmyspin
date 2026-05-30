FROM node:20-alpine AS base
WORKDIR /app

# Instalar dependencias del monorepo
COPY package*.json ./
COPY packages/engine/package.json ./packages/engine/
COPY packages/api/package.json    ./packages/api/
RUN npm ci --omit=dev

# Copiar fuentes
COPY packages/engine/src ./packages/engine/src
COPY packages/api/src    ./packages/api/src
COPY tsconfig.base.json  ./

# Variables de entorno en build
ARG NODE_ENV=production
ENV NODE_ENV=$NODE_ENV

EXPOSE 3000

CMD ["node", "--import=tsx/esm", "packages/api/src/index.ts"]
