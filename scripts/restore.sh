#!/bin/bash

# Web Communication CMS Restore Script
# Usage: ./scripts/restore.sh <backup-name>

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup-name>"
    echo "Available backups:"
    ls -1 backups/ | grep -E ".*-manifest\.txt$" | sed 's/-manifest\.txt$//' | sort -r
    exit 1
fi

BACKUP_NAME=$1
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if backup exists
if [ ! -f "$BACKUP_DIR/$BACKUP_NAME-manifest.txt" ]; then
    print_error "Backup $BACKUP_NAME not found"
    exit 1
fi

print_warning "This will restore the database and uploaded files from backup: $BACKUP_NAME"
print_warning "Current data will be OVERWRITTEN!"
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Restore cancelled"
    exit 0
fi

print_status "Starting restore: $BACKUP_NAME"

# Restore database
if [ -f "$BACKUP_DIR/$BACKUP_NAME-database.sql" ]; then
    print_status "Restoring database..."
    docker-compose exec -T db psql -U cms_user -d web_communication_cms -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    docker-compose exec -T db psql -U cms_user web_communication_cms < "$BACKUP_DIR/$BACKUP_NAME-database.sql"
    print_success "Database restored"
else
    print_error "Database backup file not found: $BACKUP_NAME-database.sql"
    exit 1
fi

# Restore uploaded files
if [ -f "$BACKUP_DIR/$BACKUP_NAME-uploads.tar.gz" ]; then
    print_status "Restoring uploaded files..."
    docker-compose exec -T backend rm -rf /app/uploads/*
    docker-compose exec -T backend tar -xzf - -C / < "$BACKUP_DIR/$BACKUP_NAME-uploads.tar.gz"
    print_success "Uploaded files restored"
else
    print_warning "Uploads backup file not found: $BACKUP_NAME-uploads.tar.gz"
fi

print_success "Restore completed: $BACKUP_NAME"
print_status "Please restart the application to ensure all changes take effect"