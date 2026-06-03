# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Backend image — multi-stage.
#   target `dev`  : full deps + nodemon hot reload (used by docker-compose dev)
#   target `prod` : slim, non-root, prod deps only (built by the CI pipeline)
# The WORKER reuses this same image; its command is overridden to run the
# BullMQ worker (`node src/worker.js`) in its compose service / ECS task def.
# ---------------------------------------------------------------------------

# ---------- Base: shared runtime foundation ----------
FROM node:20-alpine AS base
WORKDIR /app
# tini gives proper PID-1 signal handling so SIGTERM on an ECS deploy
# shuts the process down cleanly instead of being swallowed by npm/node.
RUN apk add --no-cache tini
ENTRYPOINT ["/sbin/tini", "--"]

# ---------- Prod dependencies (no devDependencies) ----------
FROM base AS prod-deps
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev

# ---------- Dev target: all deps + hot reload ----------
FROM base AS dev
ENV NODE_ENV=development
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ---------- Prod target: slim, non-root ----------
FROM base AS prod
ENV NODE_ENV=production
# Resolved production dependencies from the prod-deps stage.
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# Only what the runtime needs — never the whole context (no .env, docs, etc.).
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node src ./src
# Run as the unprivileged built-in `node` user.
USER node
EXPOSE 5000
# Lightweight liveness probe for local compose; ECS uses the task-def health check.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5000/health >/dev/null 2>&1 || exit 1
# API by default. The worker service overrides this with: node src/worker.js
CMD ["node", "src/server.js"]
