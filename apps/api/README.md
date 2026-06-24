# MERLIN Lite API (Express + TypeScript + Prisma)

Production-ready starter for MERLIN Lite (logframe and indicator M&E).

## Stack
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- Auth: email/password, JWT access tokens, bcrypt
- RBAC: ADMIN, MANAGER, DATA_ENTRY
- Validation with Zod; security hardening with Helmet, CORS, rate limiting
- Swagger UI docs served from `openapi/openapi.yml`
- Jest + Supertest tests

## Prerequisites
- Node.js 18+
- Docker (for Postgres) or a running PostgreSQL instance

## Quick start
```bash
cd backend
cp .env.example .env          # update values
docker-compose up -d postgres # or point DATABASE_URL to your DB
npm install
npx prisma migrate dev --name init
npx prisma db seed            # seeds admin user (email/password from .env)
npm run dev                   # starts API on PORT (default 4000)
```

## Running tests
Tests expect a reachable database at `DATABASE_URL` (you can reuse the dev DB).
```bash
cd backend
npm test
```

## ML Anomaly Detection
If you enable ML anomaly detection on indicators, configure the API to call the
ML service:

- `ML_SERVICE_URL` (e.g. `http://localhost:8000`)
- `ML_SERVICE_TIMEOUT_MS` (default `5000`)
- `ML_SERVICE_API_KEY` (optional)

The root `npm run dev` workflow no longer starts the ML service. Run it only if
you explicitly need ML-backed anomaly scoring.

Run the backfill job to rescore recent submissions:
```bash
npm run anomaly:backfill
```

Run an ML canary check (intended for CI/scheduled monitoring):
```bash
npm run ml:canary
```

## Migrations and Prisma
- Run migrations: `npm run prisma:migrate`
- Generate client: `npm run prisma:generate`
- Seed admin again: `npx prisma db seed`

## API
- Base path: `/api/v1`
- Docs: `GET /docs` (Swagger UI sourced from `openapi/openapi.yml`)
- ML health: `GET /api/v1/health/ml` (ADMIN/MANAGER)
- Error shape: `{ "error": { "code": string, "message": string, "details"?: any } }`

## Reminder scheduler

Automatic reminder emails can be controlled via environment variables:

- `REMINDER_SCHEDULER_ENABLED` (default: `true`) — enable/disable scheduler on startup.
- `REMINDER_CRON` (default: `0 8 * * *`) — cron expression for reminder job.
- `EMAIL_DRY_RUN` (default: `false`) — when `true`, emails are logged only and not sent.

## Notes
- Never commit real secrets; `.env.example` documents required variables.
- `jwtSecret` is required; set a strong value in `.env`.
- Rate limiting is configurable via env vars.
