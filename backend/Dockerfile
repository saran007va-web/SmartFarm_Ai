# ========================================
# SMART AI FARMING PLATFORM - BACKEND
# ========================================

FROM node:20-bookworm AS base

# ========================================
# DEPENDENCY STAGE
# ========================================
FROM base AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --only=production

# ========================================
# BUILDER STAGE
# ========================================
FROM base AS builder

WORKDIR /app

# Copy dependency files
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./

# Install all dependencies for building
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build
RUN npm run build

# ========================================
# PRODUCTION STAGE
# ========================================
FROM base AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nodejs -g nodejs

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Change ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Start command
CMD ["node", "dist/index.js"]