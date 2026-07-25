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
COPY apps/web/package.json ./apps/web/
COPY apps/web/package-lock.json* ./apps/web/ 2>/dev/null || true

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web/ ./apps/web/
COPY packages/ ./packages/

# Build the application
RUN pnpm --filter web build

# =============================================
# Stage 2: Production (nginx)
# =============================================
FROM nginx:1.27-alpine AS production

# Copy built static files
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/index.html 2>/dev/null || true

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:80 || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
