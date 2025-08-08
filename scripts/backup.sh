#!/bin/bash

# Web Communication CMS Backup Script
# Usage: ./scripts/backup.sh [backup-name]

set -e

BACKUP_NAME=${1:-"backup-$(date +%Y%m%d-%H%M%S)"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

print_status "Starting backup: $BACKUP_NAME"

# Backup database
print_status "Backing up database..."
docker-compose exec -T db pg_dump -U cms_user web_communication_cms > "$BACKUP_DIR/$BACKUP_NAME-database.sql"

# Backup uploaded files
print_status "Backing up uploaded files..."
docker-compose exec -T backend tar -czf - /app/uploads > "$BACKUP_DIR/$BACKUP_NAME-uploads.tar.gz"

# Create backup manifest
print_status "Creating backup manifest..."
cat > "$BACKUP_DIR/$BACKUP_NAME-manifest.txt" << EOF
Backup Name: $BACKUP_NAME
Created: $(date)
Database: $BACKUP_NAME-database.sql
Uploads: $BACKUP_NAME-uploads.tar.gz
EOF

print_success "Backup completed: $BACKUP_DIR/$BACKUP_NAME"
print_status "Files created:"
print_status "  - $BACKUP_NAME-database.sql"
print_status "  - $BACKUP_NAME-uploads.tar.gz"
print_status "  - $BACKUP_NAME-manifest.txt"