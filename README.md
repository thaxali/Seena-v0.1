# Seenazero

A modern web application built with Next.js, Node.js, Supabase, and OpenAI.

## Project Structure

```
seenazero/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Node.js backend
└── packages/
    └── shared/       # Shared utilities and types
```

## Prerequisites

- Node.js 18+
- npm 10+
- Supabase account
- OpenAI API key

## Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/seenazero.git
   cd seenazero
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `apps/web/.env.example` to `apps/web/.env.local`
   - Copy `apps/api/.env.example` to `apps/api/.env`
   - Fill in your Supabase and OpenAI credentials

4. Start the development servers:
   ```bash
   npm run dev
   ```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Deployment

Both the frontend and backend are configured for deployment on Vercel:

1. Frontend: Connect your GitHub repository to Vercel and it will automatically deploy the Next.js app
2. Backend: Deploy the Node.js app as a serverless function on Vercel

## Features

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Supabase Authentication
- OpenAI Integration
- Express.js Backend
- Monorepo Structure with Turborepo

## Development

- `npm run dev`: Start all apps in development mode
- `npm run build`: Build all apps
- `npm run lint`: Run linting
- `npm run format`: Format code with Prettier
