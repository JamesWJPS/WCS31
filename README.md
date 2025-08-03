# Web Communication CMS

A content management system designed specifically for Town and Parish Councils to provide WCAG 2.2 accessible websites.

## Project Structure

This is a monorepo containing:

- `backend/` - Node.js/Express API server
- `frontend/` - React application

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Installation

1. Install dependencies for all workspaces:
   ```bash
   npm install
   ```

2. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   ```

3. Start development servers:
   ```bash
   npm run dev
   ```

This will start both the backend API server (port 3001) and frontend development server (port 3000).

## Development Scripts

- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both projects for production
- `npm run test` - Run tests for both projects
- `npm run lint` - Run ESLint for both projects
- `npm run format` - Format code with Prettier for both projects

## Individual Project Scripts

### Backend
- `npm run dev --workspace=backend` - Start backend development server
- `npm run build --workspace=backend` - Build backend for production
- `npm run test --workspace=backend` - Run backend tests

### Frontend
- `npm run dev --workspace=frontend` - Start frontend development server
- `npm run build --workspace=frontend` - Build frontend for production
- `npm run test --workspace=frontend` - Run frontend tests

## Architecture

The system is built as a headless CMS with:

- **Backend**: RESTful API providing content management, user authentication, and document storage
- **Frontend**: React SPA for content editing and administration
- **Public Website**: Template-rendered public-facing website

## Features

- Role-based access control (Administrator, Editor, Read-only)
- WCAG 2.2 compliant templates
- Document management with folder organization
- Content editing with WYSIWYG interface
- Secure file upload and storage
- Template-based content rendering