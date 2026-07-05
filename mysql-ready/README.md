# MySQL Ready

This folder is a separate, thin switch-over area for a future MySQL migration.
It does not change the current PostgreSQL app.

Use this only when you are ready to move the API off PostgreSQL.

## Draft schema

- [`schema.prisma`](schema.prisma) is a MySQL-targeted draft copied from the
  current API schema
- It keeps the current model shape as much as possible while removing the
  PostgreSQL-only provider and timestamp annotations
- Treat it as a starting point for a future migration branch, not a finished
  production migration

## Current MySQL setup

This folder also includes a standalone MySQL container setup so you can run a
MySQL database now without changing the app:

- [`docker-compose.yml`](docker-compose.yml) starts MySQL on port `3306`
- [`mysql.env.example`](mysql.env.example) holds the local database password
- The app does not connect to this database yet

## What changes later

- Change Prisma datasource provider from `postgresql` to `mysql`
- Replace PostgreSQL-only schema features
- Create new migrations for MySQL
- Point `DATABASE_URL` to a MySQL instance

## Current blocker list

The live app is still PostgreSQL-based. The biggest schema items that need
attention before a real MySQL cutover are:

- `String[]` fields such as `Project.sectors`
- `@db.Timestamptz(6)` fields in the legacy sales models
- Any migration history generated for PostgreSQL

## Safe rule

Do not point production at this folder until the schema and migrations have
been rebuilt for MySQL and tested in a fresh database.
