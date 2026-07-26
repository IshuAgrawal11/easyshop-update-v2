# ==========================================
# Stage 1: Install Cached Dependencies
# ==========================================
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Only copy lock files to optimize Docker layer cache
COPY package.json package-lock.json ./
RUN npm ci

# ==========================================
# Stage 2: Next.js Standalone Builder
# ==========================================
FROM node:18-alpine AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Leverage standalone output optimization defined in your next.config.js
RUN npm run build

# ==========================================
# Stage 3: Hardened Production Runner
# ==========================================
FROM node:18-alpine AS runner
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
ENV HOST=0.0.0.0

CMD ["node", "server.js"]