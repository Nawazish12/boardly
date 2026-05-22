# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Frontend image — multi-stage.
#   target `dev`  : Vite dev server + hot reload (used by docker-compose dev)
#   target `prod` : static assets built by Vite, served by nginx (CI pipeline)
# Production design: the ALB routes `/api/*` to the backend and everything else
# to this nginx, so the app calls a same-origin `/api` (VITE_API_URL default).
# nginx here is therefore a pure static server with SPA fallback — no /api proxy.
# ---------------------------------------------------------------------------

# ---------- Dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- Dev target: Vite dev server + hot reload ----------
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ---------- Build target: produce static assets ----------
FROM deps AS build
ENV NODE_ENV=production
COPY . .
# VITE_API_URL defaults to "/api" (same-origin via ALB). Override at build only
# if the API ever lives on a different origin.
RUN npm run build

# ---------- Prod target: nginx serving the built assets ----------
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# nginx:alpine's default entrypoint launches nginx in the foreground.
