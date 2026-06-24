# Merlin Lite

Merlin Lite is a monorepo with three services:

- `apps/web/` - React + Vite frontend
- `apps/api/` - Express + TypeScript + Prisma backend

## Prerequisites

- Node.js 18+
- PostgreSQL for the API

## Project Structure

- `apps/web/index.tsx` and `apps/web/App.tsx` are the frontend entry points.
- `apps/web/components/`, `apps/web/pages/`, and `apps/web/services/` hold the UI and API client code.
- `apps/api/src/` contains the API routes, controllers, services, jobs, and middleware.
- `apps/api/prisma/` contains the Prisma schema and seed data.
- `apps/api/openapi/` contains the API documentation source.

## Quick Start

1. Install dependencies from the repo root:

```bash
npm install
```

2. Configure the web app by creating `apps/web/.env`:

```bash
cd apps/web
touch .env
```

Set `VITE_API_BASE_URL` to your API URL. The default value used by the app is:

```text
http://localhost:4000/api/v1
```

3. Configure the API by creating `apps/api/.env`:

```bash
cd apps/api
touch .env
```

Set at least:

- `DATABASE_URL`
- `JWT_SECRET`

Optional API variables include:

- `APP_URL`
- `ML_SERVICE_URL`
- `ML_SERVICE_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_AUTH_REDIRECT_URI`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

4. Start the services:

```bash
npm run dev
```

This starts:

- the API on port `4000`
- the web app on port `5173`

## Common Commands

Run from the repo root:

- `npm run dev` - start web and API together
- `npm run dev:web` - start only the web app
- `npm run dev:api` - start only the API
- `npm run build` - build the web and API apps
- `npm run test:api` - run the API test suite

## API Notes

- The API base path is `/api/v1`
- Swagger docs are available at `GET /docs`
- Prisma migrations and client generation are run from `apps/api/`
- The API expects PostgreSQL and a valid `DATABASE_URL`

For more API-specific setup, see [`apps/api/README.md`](apps/api/README.md).

## Frontend Notes

- The frontend reads `VITE_API_BASE_URL` at build time.
- If the API runs somewhere other than `http://localhost:4000/api/v1`, update that variable before starting the web app.

## Security

- Do not commit secrets or production credentials.
- Keep `.env` files local to your machine.
