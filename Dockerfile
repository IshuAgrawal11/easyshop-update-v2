FROM node:18-alpine AS builder

WORKDIR /app

# Disable Next.js telemetry during the build
ENV NEXT_TELEMETRY_DISABLED=1

# Install necessary build dependencies
RUN apk add --no-cache python3 make g++ libc6-compat

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy all project files
COPY . .

# Build the Next.js application
RUN npm run build

# ==========================================
# Stage 2: Production Stage
# ==========================================
FROM node:18-alpine AS runner

WORKDIR /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
# Disable telemetry during runtime
ENV NEXT_TELEMETRY_DISABLED=1 

# Copy necessary files from builder stage and assign ownership to the 'node' user
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

# Switch to the restricted 'node' user for security
USER node

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "server.js"]