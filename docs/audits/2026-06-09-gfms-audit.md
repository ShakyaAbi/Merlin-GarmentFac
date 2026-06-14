# GFMS Audit Report

Date: 2026-06-09
Repo: Merlin Lite

## Executive Summary

The codebase is a strong M&E application with a working auth/project/indicator stack, plus inventory and sales-invoice extensions. It is not yet a production-ready Garment Factory Management System. Core manufacturing workflows, stand-alone customer/payment/expense management, and a number of end-to-end stock/business rules are still missing or only partially represented.

Build baseline:
- `apps/web` build passes.
- `apps/api` build passes.

## Complete

### Authentication and user basics
- JWT auth, password hashing, password change, role checks, user/profile management, and route protection exist.
- The main auth middleware and RBAC middleware are in place.

### Core M&E platform
- Projects, logframes, indicators, submissions, imports, exports, templates, dashboards, and anomaly review remain implemented.
- The existing app shell and most project/indicator pages are wired end to end.

### Inventory foundation
- Supplier, raw material, purchase, BOM, finished-good product, and stock transaction models exist.
- Material CRUD, supplier CRUD, purchases, BOM creation, finished-goods handling, and material stock history pages exist.
- Material CSV import/export is wired into the UI and API.
- Raw material stock increases on purchase transactions and adjustment flows.
- Finished-goods master data now has a dedicated web page and list/create/delete support.

### Sales invoice workflow
- Sales invoice create/list/detail/payment/issue/cancel flows exist.
- Finished-good stock is tied into sales invoice issuance and cancellation logic.
- Customer and finished-good lookup endpoints now exist for invoice creation.
- The frontend lookup contract now matches the mounted API routes.
- Draft invoices do not move inventory; issuance and cancellation do.
- Sales invoice export/download now uses the supported CSV path end to end.

### Expense management
- A dedicated expense ledger now exists in the API and web app with list, create, detail, update, and delete flows.
- Expense records are persisted in the database and are accessible from the app shell.

### Payment management
- Invoice payments are now exposed through a dedicated payments register in the web app.
- The payment ledger is backed by the existing invoice payment records, so payment tracking is visible without duplicating accounting logic.

### BOM creation
- BOM create payloads are now validated before reaching the repository.

### Customer master data
- Customer list/create/update/soft-delete flows now exist as a dedicated module.
- Customer records are reachable from the web app and still feed sales invoice lookup flows.

## Partial

### Production management
- A first-pass production domain now exists with one finished-good output per order, BOM selection, raw-material issue on start, and finished-good receipt on completion.
- The production migration has been applied to the live database and the new table is reachable through Prisma.
- The web app now includes both a production register and a production detail view that exposes issue and completion lines.
- The production detail view now also shows an estimated material cost snapshot based on BOM consumption.
- Production completion is now capped so received quantity cannot exceed planned quantity.
- Impact: the backbone workflow is now visible in the UI, but it still lacks richer WIP, multi-stage routing, and advanced shop-floor tracking.
- Recommended fix: extend the workflow with richer status history and multi-step shop-floor operations if the business needs them.

## Missing

### Customer management
- Customer data is now exposed through a dedicated customer module with a detail page and invoice history drilling.
- Impact: the base master-data gap is now substantially closed, though the module still has less lifecycle automation than some inventory screens.
- Recommended fix: add richer filtering or lifecycle automation only if the business needs it.

### Reports and profitability
- A dedicated operations dashboard now exists for inventory, finished goods, customers, suppliers, purchases, and sales invoices.
- The dashboard now also incorporates expense totals and an estimated profit snapshot from invoice, purchase, and expense data.
- The dashboard now also includes production orders plus a production-cost snapshot based on BOM consumption.
- The dashboard now separates total production cost from work-in-progress cost.
- Impact: the app has a useful high-level profitability view, WIP visibility, and production-cost visibility, but it still does not allocate overhead or provide a full manufacturing costing model.
- Recommended fix: extend the dashboard with overhead allocation if you need a true margin statement.

### Export functionality
- The web app now exposes a dedicated export center for material CSV exports, material import templates, and sales-invoice CSV exports.
- Existing export endpoints are reachable from the app shell instead of being buried in ad hoc screens.

### Finished-goods dashboard and admin
- Finished-good products now have a dedicated catalog page in the web app.
- Impact: the basic catalog-management gap is closed, though edit/detail flows are still lightweight.
- Recommended fix: add richer detail/edit views if the business needs them.

## Security Issues

### Auth bypass in dev mode
- Root cause: `authenticate` bypasses JWT checks when `authDisabled` is set, but the bypass is now restricted to localhost-only requests.
- Impact: safe for local development, and no longer permitted on non-local requests.
- Recommended fix: keep the localhost-only guard and avoid enabling the bypass in deployed environments.

## Performance Issues

### Repeated on-demand material stock aggregation
- Root cause: some list endpoints compute current stock per material individually.
- Impact: list pages may issue more database work than necessary as volume grows.
- Recommended fix: batch stock aggregation or use a grouped query with cached material summaries.

### Dynamic import fallback on hot paths
- Root cause: some inventory route handlers use dynamic imports inside request handlers.
- Impact: unnecessary runtime complexity and harder error visibility.
- Recommended fix: import controllers statically at module load unless there is a strong reason not to.

## Technical Debt

### Mixed implementation styles
- The repo contains both the original M&E platform and a newer inventory/sales extension, which makes the feature boundary harder to reason about.
- Some pages are highly polished while adjacent domains remain scaffolding-only.

### Soft-delete and audit consistency
- Audit logging exists for several flows, but not all modules use the same pattern.
- Soft-delete handling is inconsistent across repositories.

### Settings
- The settings page now includes profile, security, and system information tabs.
- Impact: the settings surface is no longer just a profile/password stub and now exposes runtime context useful for operators.
- Recommended fix: add additional organization or notification settings only if the business needs them.

### Route parity drift
- Frontend service expectations and backend route mounts were not always aligned; the sales-invoice lookup mismatch has now been closed.
- Impact: route parity is improved, but any new service additions still need route wiring discipline.
- Recommended fix: keep route and client service additions paired in the same change set.

## Recommended Next Fix Order

1. Add validation and normalized error handling to the BOM admin controller.
2. Add production workflow modules for material issue, reservation, and finished-good receipt.
3. Add missing customer, sales-order, expense, and reporting modules.
4. Add dedicated finished-goods administration pages in the web app.
5. Normalize audit and soft-delete handling across all inventory repositories.
