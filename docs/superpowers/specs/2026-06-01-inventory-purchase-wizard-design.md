Title: Inventory - Purchase Wizard Design

Summary
- Provide a Purchase creation wizard in the web app that allows Admin/Manager users to create purchases from suppliers, add multiple line items, and persist a transactional purchase that updates stock and material costing.

Goals
- Simple, focused UI to create purchases
- Reuse existing API auth and patterns
- Validate input both client and server side
- Ensure server transactional integrity (already implemented)

Pages / Components
- PurchaseCreate page: form with supplier select, list of line items, add/remove lines, submit button
- LineItem row: material select, quantity, unit, unit price

API
- POST /api/v1/inventory/purchases — validates payload with zod, returns { id, totalAmount }
- GET /api/v1/inventory/suppliers
- GET /api/v1/inventory/materials

Server Behavior
- createPurchase is executed in a single DB transaction. It creates purchase, purchase items, stock transactions, and updates material costPrice (last-price policy). If any step fails, whole transaction rolls back.

Validation
- Client side: basic required checks
- Server side: zod schema (implemented)

Jobs / Notifications
- Low stock checker creates LowStockAlert rows; UI page lists and allows acknowledging alerts.

Testing
- Unit tests for services and integration tests for controller flows exist. Added test to ensure invalid input returns 400.

Open items
- Improve UI/UX for purchase wizard (pricing calculators, unit conversions, inline validation)
- Add E2E tests (Cypress/Playwright)
