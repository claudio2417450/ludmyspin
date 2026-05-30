FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY packages/web/package.json ./packages/web/
RUN npm ci

COPY packages/web ./packages/web
COPY tsconfig.base.json ./

# VITE_API_URL apunta a la URL del servicio API en Railway
ARG VITE_API_URL=https://ludmyspin-api.up.railway.app
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build -w packages/web

# ── Servidor estático mínimo ──────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/packages/web/dist ./dist
EXPOSE 3001
CMD ["serve", "-s", "dist", "-l", "3001"]
