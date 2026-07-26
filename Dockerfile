# ==========================================
# Stage 1: Install Cached Dependencies
# ==========================================
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Only copy lock files to optimize Docker layer cache
COPY package.json package-lock.json ./
RUN npm ci

# ==========================================
# Stage 2: Next.js Standalone Builder
# ==========================================
FROM node:22-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# The build step only imports server modules to bundle them — it never
# actually needs a working secret/DB connection. These placeholders satisfy
# the fail-fast checks in src/lib/auth/utils.ts and src/lib/db.ts at build
# time; the real values come from docker-compose's env_file at container
# start and are never baked into this image (each stage is a fresh FROM).
ARG JWT_SECRET=build-time-placeholder-not-used-at-runtime
ARG MONGODB_URI=mongodb://localhost:27017/easyshop
ENV JWT_SECRET=$JWT_SECRET
ENV MONGODB_URI=$MONGODB_URI

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Leverage standalone output optimization defined in your next.config.js
RUN npm run build

# ==========================================
# Stage 3: Hardened Production Runner
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1 

# Create secure system groups and users to stop container runtime exploits
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
# Next's standalone server reads HOSTNAME (not HOST) to pick its bind
# address. Docker sets HOSTNAME to the container id by default, which made
# the server bind only to the container's internal IP — unreachable via
# 127.0.0.1 (breaking the healthcheck below) and via docker's userland
# proxy in some network configs. Force it to listen on all interfaces.
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]