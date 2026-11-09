# ============================================================================
# ArthaAI Institutional Admin Portal Frontend (Node build + Nginx runtime)
# ============================================================================

# ── Stage 1: Build Admin React SPA ──────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit

# Copy source code and build production assets
COPY . .
ENV NODE_ENV=production
RUN npm run build

# ── Stage 2: Nginx Production Server ─────────────────────────────────────────
FROM nginx:alpine-slim AS runner

# Remove default nginx static page
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy production Nginx reverse proxy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O - http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]

