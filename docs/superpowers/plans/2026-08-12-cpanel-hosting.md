# cPanel Hosting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Host MERLIN Lite on a cPanel server with a production React frontend, Express/Prisma API, MySQL database, uploads, email, scheduled reminders, HTTPS, and an optional external ML service.

**Architecture:** Keep the existing website on its current domain, document root, Apache configuration, database, and processes. Serve MERLIN's Vite build from its own cPanel subdomain, such as `merlin.example.com`, and run the Express API as a separate cPanel Application Manager/Passenger Node.js application on `api.merlin.example.com`; it listens on the port supplied by Passenger and connects to a separate cPanel-managed MySQL database. Keep the ML service disabled for the first launch unless the host supports a separate Python Passenger application or an external HTTPS ML endpoint.

**Tech Stack:** React 19, Vite 6, Express 4, TypeScript, Node.js 20, Prisma 5, MySQL 8-compatible server, cPanel Application Manager/Passenger, Apache/HTTPS, Python 3.11 FastAPI only when ML is enabled.

## Global Constraints

- Use a cPanel plan that explicitly provides Node.js 20 or a compatible newer runtime, Application Manager/Passenger, SSH or Terminal, MySQL, cron jobs, Git or archive upload, and SSL.
- Do not deploy the repository's Docker Compose files to ordinary shared cPanel; Docker Compose is for a VPS/container host and is not part of the standard cPanel user workflow.
- Use MERLIN-only hostnames: `merlin.example.com` for the frontend and `api.merlin.example.com` for the API. Replace `example.com` with the real domain without reusing the existing site's hostname.
- Set `VITE_API_BASE_URL=https://api.merlin.example.com/api/v1` at frontend build time; Vite variables are compiled into the static bundle and cannot be changed after upload.
- Set `APP_URL=https://merlin.example.com` and `CORS_ORIGINS=https://merlin.example.com` in the API environment.
- Do not change the existing site's `public_html`, `.htaccess`, virtual host, DNS records, SSL certificate, database, environment files, cron jobs, or process manager configuration.
- Do not reuse the existing site's database or database user; create a MERLIN-specific database and user.
- Never upload or commit real secrets, `.env` files, database dumps, private keys, or the local `node_modules` directory.
- Take a database backup and copy the uploads directory before every production migration or release.
- Set `REMINDER_SCHEDULER_ENABLED=false` if reminders are run by cPanel cron; otherwise leave it `true` and run only one API worker.

## Deployment Decision

Choose one before implementation:

1. **Standard cPanel shared hosting (recommended first launch):** frontend + Node API + MySQL; set `ML_SERVICE_URL` empty and verify the API's fallback anomaly behavior. This is the minimum viable production deployment.
2. **cPanel VPS/root server:** the same layout, plus a Python Passenger application for `apps/ml`, or a private ML service on the same server. Use this only if the provider confirms Python Passenger support, enough memory for NumPy/scikit-learn, and a private application-to-application connection.
3. **Hybrid:** standard cPanel for frontend/API/database and a separate HTTPS Python service for ML. Set `ML_SERVICE_URL` and `ML_SERVICE_API_KEY` only after the external service passes its health and authorization checks.

The existing `deploy/docker-compose.yml`, `deploy/nginx.conf`, and `deploy/ecosystem.config.js` describe a VPS Docker/nginx deployment. They are reference material, not the cPanel deployment mechanism.

## Strict Coexistence Boundary

The current website is out of scope and must remain online throughout this deployment. Treat the server as two independent applications:

| Resource | Existing website | MERLIN |
|---|---|---|
| Public hostname | Existing domain | `merlin.example.com` |
| API hostname | Existing API, if any | `api.merlin.example.com` |
| Document root | Existing path, unchanged | `/home/CPUSER/merlin-web` |
| Node application | Existing process, unchanged | `/home/CPUSER/merlin-api` |
| Database | Existing database/user, unchanged | New `CPUSER_merlin` database and user |
| Uploads | Existing upload directory | `/home/CPUSER/merlin-api/uploads` |
| Logs/restart | Existing controls | MERLIN Passenger logs and `merlin-api/tmp/restart.txt` |
| DNS/SSL | Existing records/certificate, unchanged | New subdomain records/certificate only |

Before any upload, record the existing site's domain, document root, active `.htaccess`, database name, database user, running process, cron entries, and backup location. If the host only provides one shared `public_html` and cannot create a separate subdomain document root, do not deploy MERLIN there; ask the provider to create an isolated subdomain or use a separate cPanel account.

### Current cPanel layout observed

The cPanel home directory currently contains `app.daybookq.com`, `api.daybookq.com`, and `merlin-api.daybookq.com`, along with `public_html`. Use this as the working isolation map, subject to verification in cPanel:

- Treat `app.daybookq.com` and `api.daybookq.com` as existing applications. Do not edit, delete, restart, or install MERLIN files into either directory.
- Use `merlin-api.daybookq.com` only for the MERLIN API if cPanel Application Manager confirms that it is mapped to the MERLIN API hostname and application root.
- Create a separate `merlin.daybookq.com` subdomain and document root for the MERLIN frontend. Do not use `public_html` unless cPanel explicitly shows that it belongs to the MERLIN hostname.
- Before uploading, run read-only checks such as `pwd`, `ls -ld app.daybookq.com api.daybookq.com merlin-api.daybookq.com public_html`, and `find merlin-api.daybookq.com -maxdepth 1 -type f -printf '%f\n'`. Save the output so the existing state can be restored if needed.

## Files and Responsibilities

- Modify: `deploy/api.env.example` — document cPanel-safe production values and make the ML/reminder choices explicit.
- Modify: `deploy/web.env.example` — document the production API subdomain value and build-time nature of Vite variables.
- Create or modify: `deploy/cpanel/README.md` — store the cPanel runbook, directory layout, commands, DNS/SSL checklist, and rollback procedure.
- Create: `deploy/cpanel/api.env.example` — provide a cPanel-specific environment template without Docker hostnames such as `mysql` or `ml`.
- Create: `deploy/cpanel/release.sh` — optional, non-destructive release helper that installs dependencies, builds the API, runs Prisma deploy after a backup checkpoint, and touches Passenger's restart file.
- Verify only: `apps/api/src/server.ts` — confirm the app listens on `process.env.PORT` (already provided through `config.port`) and does not hard-code port 4000.
- Verify only: `apps/api/src/app.ts` — confirm `/api/v1` routes, `/uploads` static files, CORS, and proxy trust work behind Passenger.
- Verify only: `apps/web/vite.config.ts` — confirm `VITE_BASE_URL` and `VITE_API_BASE_URL` are supplied during the build.
- Preserve: `apps/api/prisma/migrations/` — production must use `prisma migrate deploy`, never `prisma migrate dev`.
- Preserve and back up: `apps/api/uploads/` — uploaded evidence and article images are runtime data.

### Task 1: Confirm provider capability before purchasing or configuring

**Files:** None.

- [ ] Ask the provider to confirm all of these in writing: Node.js 20 (or the exact supported version), cPanel Application Manager, Passenger, SSH/Terminal, npm, MySQL 8-compatible server, cron jobs, SSL/AutoSSL, outbound SMTP, writable application directories outside `public_html`, and whether Python Passenger applications are enabled.
- [ ] Confirm the account's memory, CPU, disk, inode, process, and database limits. A small shared plan may build the project but fail when Prisma, Passenger, or scikit-learn starts.
- [ ] Confirm whether the API may run on an API subdomain and whether the provider requires a specific application root or startup-file convention.
- [ ] If Node.js 20 or Application Manager is unavailable, stop this cPanel path and use a VPS/container host instead. cPanel's current documentation lists Node.js packages and Passenger/Application Manager as provider-managed requirements. [cPanel Node.js installation](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/) and [Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/132/)

### Task 2: Prepare a production release locally

**Files:** `package-lock.json`, `apps/api/package-lock.json`, `apps/web/package-lock.json`, `apps/api/dist/`, `apps/web/dist/`.

- [ ] Start from a clean, reviewed commit and record it as the release tag, for example `v1.0.0-cpanel`.
- [ ] Install using the repository's Windows-safe runner when working locally:

```powershell
npm.cmd ci
npm.cmd --workspace apps/api run prisma:generate
npm.cmd run test:api
npm.cmd run build:web
npm.cmd run build:api
```

- [ ] Build the frontend with a production environment file containing:

```dotenv
VITE_API_BASE_URL=https://api.merlin.example.com/api/v1
VITE_BASE_URL=/
```

- [ ] Confirm `apps/web/dist/index.html` exists and the generated JavaScript contains the API hostname.
- [ ] Confirm `apps/api/dist/server.js` exists and that the API package contains `prisma/schema.prisma`, `prisma/migrations`, `openapi/openapi.yml`, and `uploads/`.
- [ ] Do not copy the Docker-only values `DATABASE_URL=mysql://...@mysql:3306/...` or `ML_SERVICE_URL=http://ml:8000` to cPanel. cPanel database host is normally `localhost` unless the provider gives another host.

### Task 3: Create DNS, email, and cPanel resources

**Files:** None.

- [ ] Do not alter the existing site's A/AAAA records.
- [ ] Create only `merlin.example.com` and `api.merlin.example.com` as MERLIN subdomains, each pointing to the cPanel server.
- [ ] Create a dedicated mailbox such as `noreply@example.com` if the provider's SMTP service is used. Record SMTP host, port, username, encryption expectation, and sender address.
- [ ] In cPanel, run AutoSSL or install the certificate for both MERLIN subdomains; do not replace or edit the existing site's certificate. Require HTTPS before testing login or OAuth. cPanel exposes certificate coverage through SSL/TLS Status. [SSL/TLS Status](https://docs.cpanel.net/cpanel/security/ssl-tls-status/)
- [ ] Create the MySQL database and user with cPanel's MySQL Database Wizard, grant the user all required privileges on that database, and record the fully prefixed names, for example `cpuser_merlin` and `cpuser_merlinapp`. Do not create the database/user through phpMyAdmin because cPanel needs the ownership mapping for backups. [cPanel MySQL Databases](https://docs.cpanel.net/cpanel/databases/mysql-databases/)

### Task 4: Provision and migrate the MySQL database

**Files:** `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`.

- [ ] Construct the cPanel connection string with the provider's actual values:

```dotenv
DATABASE_URL=mysql://cpuser_merlinapp:URL_ENCODED_PASSWORD@localhost:3306/cpuser_merlin
```

- [ ] URL-encode reserved password characters such as `@`, `:`, `/`, `?`, and `#` before placing the password in `DATABASE_URL`.
- [ ] For a new empty database, run from the API project directory after dependencies and Prisma Client are installed:

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

- [ ] For an existing database, export a SQL dump from the source first, create the target database, import the dump through phpMyAdmin or the provider's supported import method, then run `npx prisma migrate deploy`. Do not run `prisma migrate dev` on production.
- [ ] Verify the migration table and application tables exist, then create or rotate the seeded admin password immediately. The seed defaults in `apps/api/prisma/seed.ts` must never remain in use.
- [ ] Configure cPanel backup retention for both the database and uploaded files. cPanel's database tools support database management and phpMyAdmin data operations; the provider's account backup policy must be verified separately.

### Task 5: Deploy the Express API as a cPanel Node.js application

**Files:** `apps/api/dist/`, `apps/api/prisma/`, `apps/api/openapi/`, `apps/api/uploads/`, `.env` outside the public document root.

- [ ] Create a private application directory such as `/home/CPUSER/merlin-api`; do not put source, `.env`, Prisma schema, or uploads under `public_html`.
- [ ] Upload or clone only the API release into that directory. At minimum it needs `dist/`, `prisma/`, `openapi/`, `package.json`, and the package lock file.
- [ ] In cPanel Application Manager, register a separate Node.js application for `api.merlin.example.com` with production mode, the provider-supported Node version, application root `/home/CPUSER/merlin-api`, and startup file `dist/server.js` if the interface accepts a nested startup file. Do not edit or restart the existing site's Node application. If the provider requires `app.js`, create a small provider-approved startup wrapper that loads `dist/server.js`; test that wrapper before production registration.
- [ ] Install production dependencies in the API directory. Prefer `npm ci --omit=dev` only after confirming Prisma CLI is available for the migration step; otherwise install normally for the migration, then remove development packages only if the provider's runtime remains functional.
- [ ] Place the API environment file outside the web root with these values:

```dotenv
NODE_ENV=production
PORT=0
APP_URL=https://merlin.example.com
CORS_ORIGINS=https://merlin.example.com
DATABASE_URL=mysql://cpuser_merlinapp:URL_ENCODED_PASSWORD@localhost:3306/cpuser_merlin
JWT_SECRET=GENERATE_A_LONG_RANDOM_SECRET
JWT_EXPIRES_IN=1h
AUTH_DISABLED=false
RATE_LIMIT_ENABLED=true
ML_SERVICE_URL=
ML_SERVICE_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_AUTH_REDIRECT_URI=https://api.merlin.example.com/api/v1/auth/google/callback
SMTP_HOST=provider-smtp-host
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=mailbox-password
SMTP_FROM=noreply@example.com
REMINDER_SCHEDULER_ENABLED=false
REMINDER_CRON=0 8 * * *
EMAIL_DRY_RUN=false
```

- [ ] Do not force a fixed public port: `PORT=0` lets Passenger supply its reverse-bound port; if the provider requires a value, leave `PORT` unset and verify `config.port` uses the Passenger-provided environment.
- [ ] Create `apps/api/uploads`, make it writable by the cPanel application user, and confirm it is outside `public_html`. The API already serves it at `/uploads` and builds absolute URLs from the request host.
- [ ] Restart Passenger by using the Application Manager restart control or touching `<api-app-root>/tmp/restart.txt`, then inspect the application logs. cPanel documents `tmp/restart.txt` as the Passenger restart mechanism. [Install a Node.js application](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/)

### Task 6: Deploy the static React frontend without touching the existing site

**Files:** `apps/web/dist/*`.

- [ ] Build `apps/web` with `VITE_API_BASE_URL=https://api.merlin.example.com/api/v1` and `VITE_BASE_URL=/`.
- [ ] Create a separate document root such as `/home/CPUSER/merlin-web` for the `merlin.example.com` subdomain. Upload the contents of `apps/web/dist/` there; never copy MERLIN files into the existing site's document root and never overwrite its `.htaccess`.
- [ ] Configure React Router history fallback in MERLIN's own `.htaccess`. A typical `/home/CPUSER/merlin-web/.htaccess` is:

```apache
RewriteEngine On
RewriteBase /
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

- [ ] Do not proxy `/api` through the existing site; the frontend points directly to `api.merlin.example.com` and the API's CORS allowlist must contain exactly `https://merlin.example.com`.
- [ ] Confirm the browser loads a private route after a hard refresh, static assets return 200, and API calls use HTTPS without mixed-content warnings.

### Task 7: Configure reminders, Google OAuth, and optional ML

**Files:** `apps/api/src/jobs/reminderJob.ts`, `apps/api/src/jobs/scheduler.ts`, `apps/ml/*`.

- [ ] With `REMINDER_SCHEDULER_ENABLED=false`, add one cPanel cron job only after the API is healthy. Use the API directory's supported Node binary and run the reminder command once per day, for example:

```bash
cd /home/CPUSER/merlin-api && /opt/cpanel/ea-nodejs20/bin/node node_modules/ts-node/dist/bin.js src/jobs/reminderJob.ts >> /home/CPUSER/logs/merlin-reminders.log 2>&1
```

Adjust the Node path and command to the provider's runtime. If the compiled job is not available, keep the API scheduler enabled with one worker instead of running a broken cron command. cPanel warns that overlapping cron jobs can degrade performance. [Cron Jobs](https://docs.cpanel.net/cpanel/advanced/cron-jobs/)
- [ ] Configure Google OAuth Authorized JavaScript origin as `https://merlin.example.com` and redirect URI as `https://api.merlin.example.com/api/v1/auth/google/callback`; update only the MERLIN API environment and restart only the MERLIN Passenger application.
- [ ] For ML on standard cPanel, first leave `ML_SERVICE_URL` empty and verify anomaly requests use the documented fallback. Do not expose the ML service publicly.
- [ ] For ML on cPanel VPS or hybrid hosting, deploy `apps/ml` as a private Python Passenger application using a virtual environment and `requirements.txt`, or use an external private HTTPS service. Set `ML_SERVICE_API_KEY` on both sides and verify `GET /health` plus an authenticated `POST /score` before enabling it. cPanel supports Python Passenger applications only when the provider has enabled the relevant Passenger/Python runtime. [Python WSGI application](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-python-wsgi-application/)

### Task 8: Run the production verification gate

**Files:** None.

- [ ] Check API health: `https://api.merlin.example.com/api/v1/health`.
- [ ] Check API documentation only if it is intended to be public: `https://api.merlin.example.com/docs`; otherwise protect or disable it before launch.
- [ ] While testing MERLIN, open the existing site's URL separately and verify its homepage, login, assets, API (if any), database-backed action, scheduled task, and certificate are unchanged.
- [ ] Verify that no MERLIN URL resolves to the existing site's document root and no existing-site URL resolves to `/home/CPUSER/merlin-web` or `/home/CPUSER/merlin-api`.
- [ ] Register a new user or log in with the rotated admin account; verify a wrong password returns an authentication error without exposing stack traces.
- [ ] Verify a manager/admin workflow and a DATA_ENTRY workflow, including the existing rule that 403 authorization failures do not log the user out.
- [ ] Create one project, indicator, submission, purchase/sales record, and upload; verify the upload can be retrieved from its `/uploads/...` URL.
- [ ] Test CSV import/export, PDF/invoice rendering, browser hard refresh on at least three nested routes, and logout/login after a token expiry.
- [ ] Send a real SMTP test email, then test a dry-run before enabling recurring reminders.
- [ ] Check browser console, API logs, Passenger logs, database connection errors, failed migrations, file permissions, and 404s for uploaded assets.
- [ ] Confirm HTTPS redirects, certificate coverage, security headers, CORS, rate limiting, and that MySQL is not remotely exposed.
- [ ] Run a backup restore rehearsal for the database and uploads before declaring deployment complete.

### Task 9: Establish release and rollback procedure

**Files:** `deploy/cpanel/release.sh`, `deploy/cpanel/README.md`.

- [ ] Tag every release and keep the previous frontend build, API directory, environment backup, database backup, and uploads backup until the new release passes verification.
- [ ] Release order: put the app in maintenance/read-only mode if available; back up database and uploads; upload new API; install dependencies; run `prisma migrate deploy`; build/upload frontend; restart Passenger; run smoke tests.
- [ ] Roll back code by restoring the previous API directory and frontend build, then touch `tmp/restart.txt`. Roll back a database only from a verified pre-release backup and only after assessing whether the new code wrote incompatible data.
- [ ] Never use `git reset --hard` or delete the live document root as a first rollback step. Preserve the failed release in a timestamped private directory for diagnosis.
- [ ] Set a monitoring/check schedule for API health, disk usage, database backup success, certificate expiry, cron output, SMTP delivery, and upload storage growth.

## Final Acceptance Criteria

- [ ] Provider capability confirmed and documented.
- [ ] Frontend works at `https://example.com` and survives deep-link refreshes.
- [ ] API works at `https://api.merlin.example.com`, connects to its separate MySQL database, and has correct CORS.
- [ ] Prisma migrations are applied with `migrate deploy`; admin credentials are rotated.
- [ ] Uploads persist across API restarts and are included in backups.
- [ ] SMTP, OAuth, and reminder behavior are explicitly tested or intentionally disabled.
- [ ] ML is either verified and enabled through a private service or intentionally disabled with the fallback documented.
- [ ] Database and uploads restore has been rehearsed.
- [ ] A tagged release and a tested rollback path exist.
- [ ] Existing-site coexistence has been verified after deployment, with no changes to its files, database, DNS, SSL, processes, or cron jobs.
