# PostgreSQL to MySQL switch checklist

This is the minimal checklist for the migration.

1. Update `apps/api/prisma/schema.prisma`
2. Replace PostgreSQL-only array fields with MySQL-safe alternatives
3. Remove PostgreSQL-specific column annotations
4. Generate a fresh MySQL migration set
5. Update `DATABASE_URL`
6. Run `prisma migrate deploy` on a clean MySQL database
7. Re-test auth, CRUD, reporting, and import/export flows

## Suggested schema changes

- `Project.sectors` should become `Json` or a child table
- Legacy tables using `@db.Timestamptz(6)` should use plain `DateTime`
- If exact decimal precision matters, keep Prisma `Decimal` fields and let
  MySQL map them to numeric types

## Recommended approach

Create a separate MySQL migration branch and test against an empty database
before switching any production environment.
