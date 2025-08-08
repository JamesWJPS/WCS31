import dotenv from 'dotenv';
import path from 'path';

// Load environment-specific .env file
const envFile = process.env['NODE_ENV'] === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  HOST: string;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  UPLOAD_DIR: string;
  MAX_FILE_SIZE: number;
  ALLOWED_FILE_TYPES: string[];
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;
  LOG_LEVEL: string | undefined;
  LOG_FILE: string | undefined;
}

function validateEnvironment(): EnvironmentConfig {
  const requiredVars = [
    'NODE_ENV',
    'PORT',
    'HOST',
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_EXPIRES_IN',
    'JWT_REFRESH_EXPIRES_IN',
    'CORS_ORIGIN',
    'UPLOAD_DIR',
    'MAX_FILE_SIZE',
    'ALLOWED_FILE_TYPES',
    'BCRYPT_ROUNDS',
    'RATE_LIMIT_WINDOW_MS',
    'RATE_LIMIT_MAX_REQUESTS'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT_SECRET strength in production
  if (process.env['NODE_ENV'] === 'production' && process.env['JWT_SECRET']!.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in production');
  }

  return {
    NODE_ENV: process.env['NODE_ENV']!,
    PORT: parseInt(process.env['PORT']!, 10),
    HOST: process.env['HOST']!,
    DATABASE_URL: process.env['DATABASE_URL']!,
    JWT_SECRET: process.env['JWT_SECRET']!,
    JWT_EXPIRES_IN: process.env['JWT_EXPIRES_IN']!,
    JWT_REFRESH_EXPIRES_IN: process.env['JWT_REFRESH_EXPIRES_IN']!,
    CORS_ORIGIN: process.env['CORS_ORIGIN']!,
    UPLOAD_DIR: process.env['UPLOAD_DIR']!,
    MAX_FILE_SIZE: parseInt(process.env['MAX_FILE_SIZE']!, 10),
    ALLOWED_FILE_TYPES: process.env['ALLOWED_FILE_TYPES']!.split(','),
    BCRYPT_ROUNDS: parseInt(process.env['BCRYPT_ROUNDS']!, 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env['RATE_LIMIT_WINDOW_MS']!, 10),
    RATE_LIMIT_MAX_REQUESTS: parseInt(process.env['RATE_LIMIT_MAX_REQUESTS']!, 10),
    LOG_LEVEL: process.env['LOG_LEVEL'],
    LOG_FILE: process.env['LOG_FILE']
  };
}

export const config = validateEnvironment();
export default config;