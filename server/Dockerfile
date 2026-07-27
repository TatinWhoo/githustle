# ── Stage 1: Builder ──────────────────────────────────────────────────────────
# Installs ALL dependencies (including devDependencies) for the build step.
FROM node:22.11-alpine AS builder

WORKDIR /app

# Copy manifests first for layer caching.
# If package.json doesn't change, npm ci uses the cached layer.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# ── Stage 2: Production image ─────────────────────────────────────────────────
# Starts from a clean image — installs only production deps here, no devDeps.
FROM node:22.11-alpine AS production

# Create non-root user for security (never run Node as root in production)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy manifests and source from builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/src ./src

# Install only production dependencies directly in production stage
RUN npm ci --omit=dev --ignore-scripts

# Create uploads directory with correct ownership
RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 4000

HEALTHCHECK CMD wget -q -O- http://localhost:${PORT:-4000}/health || exit 1

# Use the startup command directly (not npm start) so signals propagate correctly.
# npm wraps the process and swallows SIGTERM, preventing graceful shutdown.
CMD ["node", "src/server.js"]
