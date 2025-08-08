# Backend Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Build the application
FROM base AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:prod

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 cms

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs /app/data
RUN chown -R cms:nodejs /app

# Copy built application
COPY --from=builder --chown=cms:nodejs /app/dist ./dist
COPY --from=deps --chown=cms:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=cms:nodejs /app/package.json ./package.json

# Copy environment file
COPY --chown=cms:nodejs .env.production ./.env.production

USER cms

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/scripts/health-check.js

CMD ["npm", "run", "start:prod"]