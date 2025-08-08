# Frontend Dockerfile
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

# Production image - use nginx to serve static files
FROM nginx:alpine AS runner

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S cms -u 1001

# Set ownership
RUN chown -R cms:nodejs /usr/share/nginx/html
RUN chown -R cms:nodejs /var/cache/nginx
RUN chown -R cms:nodejs /var/log/nginx
RUN chown -R cms:nodejs /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R cms:nodejs /var/run/nginx.pid

USER cms

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]