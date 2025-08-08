# Web Communication CMS - Deployment Guide

This guide covers deploying the Web Communication CMS in production environments.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL database (for production)
- Node.js 18+ (for manual deployment)
- SSL certificates (for HTTPS)

## Quick Start with Docker

### 1. Clone and Configure

```bash
git clone <repository-url>
cd web-communication-cms
cp .env.example .env
```

### 2. Update Environment Variables

Edit `.env` and set production values:

```bash
# Database
DATABASE_URL=postgresql://cms_user:secure_password@db:5432/web_communication_cms

# Security
JWT_SECRET=your_super_secure_jwt_secret_key_here_at_least_32_chars
CORS_ORIGIN=https://your-domain.com

# Frontend
VITE_API_BASE_URL=https://api.your-domain.com/api
```

### 3. Deploy with Docker Compose

```bash
# Production deployment
docker-compose up -d

# Development deployment
docker-compose -f docker-compose.dev.yml up -d
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec backend npm run migrate

# Seed initial data
docker-compose exec backend npm run seed
```

## Manual Deployment

### Backend Deployment

1. **Install Dependencies**
   ```bash
   cd backend
   npm ci --only=production
   ```

2. **Build Application**
   ```bash
   npm run build:prod
   ```

3. **Set Environment Variables**
   ```bash
   export NODE_ENV=production
   export DATABASE_URL=postgresql://user:password@host:port/database
   export JWT_SECRET=your_secure_secret
   # ... other variables
   ```

4. **Run Database Migrations**
   ```bash
   npm run migrate
   npm run seed
   ```

5. **Start Application**
   ```bash
   npm run start:prod
   ```

### Frontend Deployment

1. **Install Dependencies**
   ```bash
   cd frontend
   npm ci --only=production
   ```

2. **Build Application**
   ```bash
   npm run build:prod
   ```

3. **Serve Static Files**
   - Copy `dist/` contents to web server
   - Configure web server for SPA routing
   - Set up SSL certificates

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `DATABASE_URL` | Database connection string | `postgresql://user:pass@host:port/db` |
| `JWT_SECRET` | JWT signing secret (32+ chars) | `your_secure_secret_key` |
| `CORS_ORIGIN` | Allowed frontend origin | `https://your-domain.com` |
| `UPLOAD_DIR` | File upload directory | `/app/uploads` |
| `VITE_API_BASE_URL` | API base URL for frontend | `https://api.your-domain.com/api` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3001` |
| `HOST` | Backend server host | `0.0.0.0` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` |
| `BCRYPT_ROUNDS` | Password hashing rounds | `12` |
| `LOG_LEVEL` | Logging level | `info` |
| `LOG_FILE` | Log file path | `/app/logs/app.log` |

## Database Setup

### PostgreSQL (Recommended for Production)

1. **Create Database and User**
   ```sql
   CREATE DATABASE web_communication_cms;
   CREATE USER cms_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE web_communication_cms TO cms_user;
   ```

2. **Enable Extensions**
   ```sql
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   CREATE EXTENSION IF NOT EXISTS "pg_trgm";
   ```

### SQLite (Development Only)

SQLite is automatically configured for development environments.

## SSL/HTTPS Configuration

### Using Nginx Reverse Proxy

1. **Install SSL Certificate**
   ```bash
   # Using Let's Encrypt
   certbot --nginx -d your-domain.com -d api.your-domain.com
   ```

2. **Configure Nginx**
   ```nginx
   server {
       listen 443 ssl;
       server_name your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       location / {
           proxy_pass http://frontend:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   
   server {
       listen 443 ssl;
       server_name api.your-domain.com;
       
       ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
       
       location / {
           proxy_pass http://backend:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## Health Checks and Monitoring

### Health Check Endpoints

- **Backend**: `GET /api/health`
- **Frontend**: `GET /health`

### Monitoring Commands

```bash
# Check application health
docker-compose exec backend npm run health-check

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Monitor resource usage
docker stats
```

## Backup and Recovery

### Database Backup

```bash
# Create backup
pg_dump -h localhost -U cms_user web_communication_cms > backup.sql

# Restore backup
psql -h localhost -U cms_user web_communication_cms < backup.sql
```

### File Backup

```bash
# Backup uploads
tar -czf uploads-backup.tar.gz uploads/

# Restore uploads
tar -xzf uploads-backup.tar.gz
```

## Security Considerations

### Production Security Checklist

- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Use PostgreSQL instead of SQLite
- [ ] Regular security updates
- [ ] Monitor logs for suspicious activity
- [ ] Backup data regularly
- [ ] Use environment variables for secrets
- [ ] Enable firewall rules

### Security Headers

The application automatically sets these security headers:

- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Content Security Policy

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database server is running
   - Check network connectivity

2. **JWT Token Issues**
   - Ensure JWT_SECRET is set and consistent
   - Check token expiration settings

3. **File Upload Issues**
   - Verify UPLOAD_DIR permissions
   - Check MAX_FILE_SIZE setting
   - Ensure disk space available

4. **CORS Errors**
   - Verify CORS_ORIGIN matches frontend URL
   - Check protocol (http vs https)

### Log Locations

- **Backend logs**: `/app/logs/app.log` (in container)
- **Nginx logs**: `/var/log/nginx/`
- **Database logs**: Check PostgreSQL configuration

### Debug Commands

```bash
# Check container status
docker-compose ps

# View environment variables
docker-compose exec backend env

# Test database connection
docker-compose exec backend npm run health-check

# Check file permissions
docker-compose exec backend ls -la /app/uploads
```

## Performance Optimization

### Production Optimizations

1. **Enable Gzip Compression** (configured in nginx.conf)
2. **Set Cache Headers** for static assets
3. **Use CDN** for static file delivery
4. **Database Indexing** (handled by migrations)
5. **Connection Pooling** (configured in database setup)

### Scaling Considerations

- Use load balancer for multiple backend instances
- Separate file storage (AWS S3, etc.)
- Database read replicas
- Redis for session storage
- Container orchestration (Kubernetes)

## Support

For deployment issues:

1. Check logs first
2. Verify environment configuration
3. Run health checks
4. Review this documentation
5. Check GitHub issues

## Default Credentials

After seeding the database:

- **Administrator**: `admin` / `admin123`
- **Editor**: `editor` / `editor123`
- **Read-only**: `readonly` / `readonly123`

**⚠️ Change these passwords immediately in production!**