# ==========================================
# STAGE 1: BUILDER
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies
COPY package*.json ./
RUN npm ci

# Copy application files
COPY . .

# ==========================================
# STAGE 2: RUNNER (Razor-thin secure image)
# ==========================================
FROM node:22-alpine AS runner

ENV NODE_ENV=production
WORKDIR /usr/src/app

# Copy dependency records
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy optimized source code
COPY --from=builder /usr/src/app/src ./src

# Create default directories with safe owner bounds
RUN mkdir -p /usr/src/app/public/uploads && chown -R node:node /usr/src/app

# Enforce secure non-root execution context
USER node

# Expose production port
EXPOSE 5000

# Docker Container OS-level Healthcheck probe
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# Start server
CMD ["node", "src/server.js"]
