# MySQL Ready

This folder is the MySQL switch-over area for the app.

Use this when you are ready to run the API on MySQL.

## Draft schema

- [`schema.prisma`](schema.prisma) is a MySQL-targeted draft copied from the
  current API schema
- It keeps the current model shape as much as possible while removing the
  PostgreSQL-only provider and timestamp annotations
- Treat it as a reference while rebuilding migrations for a fresh MySQL
  database

## Current MySQL setup

This folder also includes a standalone MySQL container setup so you can run a
MySQL database now:

- [`docker-compose.yml`](docker-compose.yml) starts MySQL on port `3306`
- [`mysql.env.example`](mysql.env.example) holds the local database password
- Point `DATABASE_URL` at this database when you want to run locally

## What changes later

- Rebuild Prisma migrations for MySQL if you are starting from a fresh DB
- Keep `DATABASE_URL` pointed at a MySQL instance

## Current blocker list

The biggest schema items that need attention before a real MySQL cutover are:

- `String[]` fields such as `Project.sectors`
- `@db.Timestamptz(6)` fields in the legacy sales models
- Any migration history generated for PostgreSQL

## Safe rule

Do not point production at this folder until the schema and migrations have
been rebuilt for MySQL and tested in a fresh database.
