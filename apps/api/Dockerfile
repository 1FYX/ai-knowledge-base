# =============================================
# Stage 1: Builder
# =============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy workspace configuration first (for layer caching)
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/api/pnpm-lock.yaml* ./apps/api/ 2>/dev/null || true

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api/ ./apps/api/
COPY packages/ ./packages/

# Build the application
RUN pnpm --filter api build

# =============================================
# Stage 2: Production
# =============================================
FROM node:22-alpine AS production

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9.15.0

# Copy package files for production install
COPY pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
COPY apps/api/nest-cli.json ./apps/api/
COPY apps/api/tsconfig*.json ./apps/api/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "apps/api/dist/main"]
