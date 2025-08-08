@echo off
REM Web Communication CMS Deployment Script for Windows
REM Usage: scripts\deploy.bat [environment]
REM Environment: development, staging, production (default: production)

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=production

echo 🚀 Starting deployment for environment: %ENVIRONMENT%

REM Check prerequisites
echo [INFO] Checking prerequisites...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed
    exit /b 1
)

echo [SUCCESS] Prerequisites check passed

REM Validate environment configuration
echo [INFO] Validating environment configuration...
set ENV_FILE=.env
if "%ENVIRONMENT%"=="production" set ENV_FILE=.env.production
if "%ENVIRONMENT%"=="staging" set ENV_FILE=.env.staging

if not exist "%ENV_FILE%" (
    echo [ERROR] Environment file %ENV_FILE% not found
    echo [INFO] Creating from template...
    copy .env.example "%ENV_FILE%"
    echo [WARNING] Please update %ENV_FILE% with your configuration
    exit /b 1
)

echo [SUCCESS] Environment configuration validated

REM Build application
echo [INFO] Building application...
call npm run clean
call npm run build:prod
if errorlevel 1 (
    echo [ERROR] Build failed
    exit /b 1
)
echo [SUCCESS] Application built successfully

REM Deploy with Docker
echo [INFO] Deploying with Docker...
set COMPOSE_FILE=docker-compose.yml
if "%ENVIRONMENT%"=="development" set COMPOSE_FILE=docker-compose.dev.yml

echo [INFO] Stopping existing containers...
docker-compose -f "%COMPOSE_FILE%" down

echo [INFO] Building and starting containers...
docker-compose -f "%COMPOSE_FILE%" up -d --build
if errorlevel 1 (
    echo [ERROR] Docker deployment failed
    exit /b 1
)

echo [INFO] Waiting for services to be ready...
timeout /t 30 /nobreak >nul

echo [SUCCESS] Docker deployment completed

REM Initialize database
echo [INFO] Initializing database...
echo [INFO] Running database migrations...
docker-compose -f "%COMPOSE_FILE%" exec -T backend npm run migrate
if errorlevel 1 (
    echo [ERROR] Database migration failed
    exit /b 1
)

if "%ENVIRONMENT%"=="development" (
    echo [INFO] Seeding database with sample data...
    docker-compose -f "%COMPOSE_FILE%" exec -T backend npm run seed
)

echo [SUCCESS] Database initialized

REM Verify deployment
echo [INFO] Verifying deployment...
docker-compose ps | findstr "Up" >nul
if errorlevel 1 (
    echo [ERROR] Some containers are not running
    docker-compose ps
    exit /b 1
)

echo [SUCCESS] 🎉 Deployment completed successfully!
echo [INFO] Application is now running at:
echo [INFO]   Frontend: http://localhost
echo [INFO]   Backend API: http://localhost:3001/api

if "%ENVIRONMENT%"=="development" (
    echo.
    echo [INFO] Default credentials:
    echo [INFO]   Admin: admin / admin123
    echo [INFO]   Editor: editor / editor123
    echo [INFO]   Read-only: readonly / readonly123
    echo [WARNING] Change these passwords in production!
)