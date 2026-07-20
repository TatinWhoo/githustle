# ── Stage 1: Builder ──────────────────────────────────────────────────────────
# Installs ALL dependencies (including devDependencies) for the build step.
# Only production deps are copied to the final image, keeping it lean.
FROM node:22-alpine AS builder

WORKDIR /app

# Copy manifests first for layer caching.
# If package.json doesn't change, npm ci uses the cached layer.
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY . .

# ── Stage 2: Production image ─────────────────────────────────────────────────
# Starts from a clean image — no devDeps, no build artifacts left over.
FROM node:22-alpine AS production

# Create non-root user for security (never run Node as root in production)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy only production deps from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/package.json ./package.json

# Create uploads directory with correct ownership
RUN mkdir -p uploads && chown -R appuser:appgroup /app

USER appuser

EXPOSE 4000

# Use the startup command directly (not npm start) so signals propagate correctly.
# npm wraps the process and swallows SIGTERM, preventing graceful shutdown.
CMD ["node", "src/server.js"]
