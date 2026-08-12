# Data-entry RBAC Design

## Goal

Allow `DATA_ENTRY` users to create and operationally process articles, raw materials, sales invoices, and production batches while preventing them from editing or deleting existing business records.

## Decisions

- The API is the security boundary. Every mutation route must reject `DATA_ENTRY` unless the operation is explicitly allowed.
- `DATA_ENTRY` may create articles, materials, sales invoices, and production batches.
- `DATA_ENTRY` may issue and complete production batches.
- `DATA_ENTRY` may create/record invoice payments, but may not edit or delete payments.
- `DATA_ENTRY` may not edit or delete articles, materials, invoices, production batches, purchases, suppliers, customers, categories, expenses, sales orders, projects, users, or any other existing record.
- Admin and manager behavior remains unchanged.
- The frontend hides unavailable edit/delete controls and keeps create/process controls visible. Direct API calls remain blocked by the server.

## Current gaps

- `apps/api/src/routes/salesInvoiceRoutes.ts` currently allows `DATA_ENTRY` to patch invoices and edit/delete invoice payments.
- `apps/api/src/routes/productionRoutes.ts` currently excludes `DATA_ENTRY` from create, issue, and complete routes, and permits managers to edit/delete.
- `apps/api/src/routes/inventoryRoutes.ts` currently excludes `DATA_ENTRY` from article/material creation, which conflicts with the requested workflow.
- A number of inventory and sales pages render mutation controls without checking the current role.

## Design

Keep the existing `requireRoles` middleware and make explicit route-level changes. Avoid introducing a broad permission framework for this focused role change. Add a small frontend capability helper based on the current user role so pages can consistently determine whether the user can create, edit, delete, issue, or complete a record.

The role capability rules are:

| Capability | Admin | Manager | Data entry |
| --- | --- | --- | --- |
| Create article/material/invoice/production batch | yes | yes | yes |
| Issue/complete production batch | yes | yes | yes |
| Create invoice payment | yes | yes | yes |
| Edit any existing business record | yes | yes | no |
| Delete any existing business record | yes | yes | no |

The exact existing route semantics remain in place for admin/manager users. For data-entry, only the explicitly allowed create and workflow endpoints are widened; no destructive endpoint is widened.

## UI behavior

- Articles and materials: show create actions, hide edit/image replacement/status/stock-adjustment/delete actions.
- Sales invoices and payments: show invoice creation and payment recording, hide invoice edit and payment edit/delete actions; do not show cancellation controls.
- Production batches: show create, issue, and complete actions; hide edit and delete actions.
- Any page that remains accessible for read-only viewing should continue to load normally.
- If a control is hidden in the UI but a stale page or direct request reaches the API, the API returns the existing forbidden response.

## Testing

- Add route-source or middleware tests that prove each newly allowed `DATA_ENTRY` route is allowed and each invoice/article/material/production edit/delete route excludes it.
- Add frontend capability tests for the data-entry capability matrix where an existing test harness supports them; otherwise verify the TypeScript build and source-level role guards for affected pages.
- Run focused API tests first, then the API test suite and web build.
- Run `graphify update .` after code changes.

## Non-goals

- No database schema or role enum change.
- No new permission-management UI.
- No change to admin or manager permissions.
- No redesign of unrelated project/logframe data-entry permissions.
