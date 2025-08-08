-- Initialize PostgreSQL database for Web Communication CMS
-- This script runs when the PostgreSQL container starts

-- Create database if it doesn't exist (handled by POSTGRES_DB env var)
-- CREATE DATABASE IF NOT EXISTS web_communication_cms;

-- Create user if it doesn't exist (handled by POSTGRES_USER env var)
-- CREATE USER IF NOT EXISTS cms_user WITH PASSWORD 'secure_production_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE web_communication_cms TO cms_user;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Set timezone
SET timezone = 'UTC';