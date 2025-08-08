#!/bin/bash

# Web Communication CMS Deployment Script
# Usage: ./scripts/deploy.sh [environment]
# Environment: development, staging, production (default: production)

set -e

ENVIRONMENT=${1:-production}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Starting deployment for environment: $ENVIRONMENT"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Validate environment configuration
validate_environment() {
    print_status "Validating environment configuration..."
    
    ENV_FILE=".env"
    if [ "$ENVIRONMENT" = "production" ]; then
        ENV_FILE=".env.production"
    elif [ "$ENVIRONMENT" = "staging" ]; then
        ENV_FILE=".env.staging"
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        print_error "Environment file $ENV_FILE not found"
        print_status "Creating from template..."
        cp .env.example "$ENV_FILE"
        print_warning "Please update $ENV_FILE with your configuration"
        exit 1
    fi
    
    # Check for required variables
    REQUIRED_VARS=("DATABASE_URL" "JWT_SECRET" "CORS_ORIGIN")
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^$var=" "$ENV_FILE"; then
            print_error "Required variable $var not found in $ENV_FILE"
            exit 1
        fi
    done
    
    print_success "Environment configuration validated"
}

# Build application
build_application() {
    print_status "Building application..."
    
    # Clean previous builds
    print_status "Cleaning previous builds..."
    npm run clean
    
    # Build backend and frontend
    print_status "Building backend and frontend..."
    npm run build:prod
    
    print_success "Application built successfully"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Run backend tests
    print_status "Running backend tests..."
    cd backend
    npm run test:ci
    cd ..
    
    # Run frontend tests
    print_status "Running frontend tests..."
    cd frontend
    npm run test:ci
    cd ..
    
    print_success "All tests passed"
}

# Deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker..."
    
    COMPOSE_FILE="docker-compose.yml"
    if [ "$ENVIRONMENT" = "development" ]; then
        COMPOSE_FILE="docker-compose.dev.yml"
    fi
    
    # Stop existing containers
    print_status "Stopping existing containers..."
    docker-compose -f "$COMPOSE_FILE" down
    
    # Build and start containers
    print_status "Building and starting containers..."
    docker-compose -f "$COMPOSE_FILE" up -d --build
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Run health checks
    print_status "Running health checks..."
    docker-compose -f "$COMPOSE_FILE" exec -T backend npm run health-check
    
    print_success "Docker deployment completed"
}

# Initialize database
initialize_database() {
    print_status "Initializing database..."
    
    COMPOSE_FILE="docker-compose.yml"
    if [ "$ENVIRONMENT" = "development" ]; then
        COMPOSE_FILE="docker-compose.dev.yml"
    fi
    
    # Run migrations
    print_status "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" exec -T backend npm run migrate
    
    # Seed database (only in development)
    if [ "$ENVIRONMENT" = "development" ]; then
        print_status "Seeding database with sample data..."
        docker-compose -f "$COMPOSE_FILE" exec -T backend npm run seed
    fi
    
    print_success "Database initialized"
}

# Verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    # Check if containers are running
    if ! docker-compose ps | grep -q "Up"; then
        print_error "Some containers are not running"
        docker-compose ps
        exit 1
    fi
    
    # Check health endpoints
    print_status "Checking health endpoints..."
    
    # Backend health check
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        print_success "Backend health check passed"
    else
        print_error "Backend health check failed"
        exit 1
    fi
    
    # Frontend health check
    if curl -f http://localhost/health > /dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        exit 1
    fi
    
    print_success "Deployment verification completed"
}

# Cleanup function
cleanup() {
    print_status "Cleaning up temporary files..."
    # Add any cleanup tasks here
    print_success "Cleanup completed"
}

# Main deployment process
main() {
    cd "$PROJECT_DIR"
    
    print_status "Starting deployment process..."
    print_status "Environment: $ENVIRONMENT"
    print_status "Project directory: $PROJECT_DIR"
    
    # Run deployment steps
    check_prerequisites
    validate_environment
    
    if [ "$ENVIRONMENT" != "production" ] || [ "${SKIP_TESTS:-false}" != "true" ]; then
        run_tests
    fi
    
    build_application
    deploy_docker
    initialize_database
    verify_deployment
    cleanup
    
    print_success "🎉 Deployment completed successfully!"
    print_status "Application is now running at:"
    print_status "  Frontend: http://localhost"
    print_status "  Backend API: http://localhost:3001/api"
    
    if [ "$ENVIRONMENT" = "development" ]; then
        print_status ""
        print_status "Default credentials:"
        print_status "  Admin: admin / admin123"
        print_status "  Editor: editor / editor123"
        print_status "  Read-only: readonly / readonly123"
        print_warning "Change these passwords in production!"
    fi
}

# Handle script interruption
trap cleanup EXIT

# Run main function
main "$@"