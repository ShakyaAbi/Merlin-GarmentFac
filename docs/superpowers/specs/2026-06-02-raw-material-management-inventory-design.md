# Raw Material Management - Inventory Pass Design

Summary
- Extend the existing MERLIN Lite inventory module and UI to manage garment raw materials in place.
- Reuse the current `Materials`, `MaterialDetail`, `PurchaseCreate`, `Purchases`, and `Alerts` pages, plus the existing inventory API and data model patterns.
- Keep this pass inventory-only: no BOM, Work Order, production consumption, costing, or ERPNext migration work yet.

Goals
- Let users create and maintain raw material records for fabric, thread, buttons, zippers, labels, packaging, elastic, interlining, accessories, and other materials.
- Reuse the current UI style, page layout, and API conventions already in MERLIN Lite.
- Track stock through the existing purchase and stock transaction flow.
- Surface low-stock materials and stock history from the current inventory pages.
- Keep audit logging for create, update, purchase, and stock adjustment actions.

Non-Goals
- No separate ERPNext/Frappe app in this pass.
- No BOM or Work Order consumption logic yet.
- No production costing, profit/loss, or monthly cost reports yet.
- No IRD integration.
- No warehouse split or transfer workflow beyond the current stock model.

Current State
- The app already has inventory routes, controllers, repositories, and UI pages.
- Existing pages include:
  - `apps/web/pages/inventory/MaterialsPage.tsx`
  - `apps/web/pages/inventory/CreateMaterialPage.tsx`
  - `apps/web/pages/inventory/MaterialDetail.tsx`
  - `apps/web/pages/inventory/PurchaseCreate.tsx`
  - `apps/web/pages/inventory/PurchasesPage.tsx`
  - `apps/web/pages/inventory/AlertsPage.tsx`
- Existing backend pieces include:
  - `apps/api/src/routes/inventoryRoutes.ts`
  - `apps/api/src/controllers/inventory/materialsController.ts`
  - `apps/api/src/services/inventory/materialService.ts`
  - `apps/api/src/repositories/inventory/materialRepository.ts`
  - `apps/api/src/repositories/inventory/purchaseRepository.ts`
- Current styling should be preserved, especially the dark sidebar and the white card-based inventory pages.

Approach
- Use the current inventory module as the source of truth for raw materials.
- Normalize raw material metadata into the existing material records instead of creating a parallel raw material system.
- Keep purchase and stock update flows transactional, with a single stock movement recorded per purchase line and per stock adjustment.
- Keep the UI mostly on the same pages, adding fields and summaries rather than adding a new page family.

Data Model
- Extend the existing raw material shape to support the required inventory fields.
- Required fields for a raw material record:
  - `name`
  - `sku` or `materialCode`
  - `category` as the primary grouping field, with the UI labeling it as item group
  - `defaultUnit`
  - `color`
  - `sizeOrWidth`
  - `gsmOrSpecification`
  - `brandOrQualityGrade`
  - `defaultSupplierId`
  - `purchaseRate`
  - `reorderLevel`
  - `defaultWarehouse`
  - `isActive`
  - `remarks`
- Keep existing stock-cost fields such as `costPrice` and `currentStock` derivation.
- Store adjustment history through the existing stock transaction table, with explicit reason and actor metadata.
- Preserve purchase metadata for later tax/reporting expansion:
  - supplier bill number
  - purchase date
  - attachment placeholder
  - remarks

Inventory Categories
- Use the existing material list to support these categories:
  - Fabric
  - Thread
  - Button
  - Zipper
  - Label
  - Packaging Material
  - Elastic
  - Interlining
  - Accessories
  - Other Raw Materials
- Categories should be stored in the `category` field and shown in the UI as item group.

UI Changes
- `MaterialsPage`
  - Keep the current card/table layout.
  - Add visible columns or badges for category, color, unit, stock, reorder level, and active status.
  - Keep the low-stock summary in the right sidebar.
  - Add entry points for creating and editing raw materials.

- `CreateMaterialPage`
  - Capture the full raw material fields needed for garment inventory.
  - Keep the form simple and aligned with the existing page style.

- `MaterialDetail`
  - Continue to act as the main control page for one material.
  - Show current stock, reorder level, cost price, supplier, category, and remarks.
  - Keep sections for transactions, purchase history, price history, and BOM references if already available.
  - Keep edit and adjust-stock modals, but require a reason for stock adjustment.

- `PurchaseCreate`
  - Keep the current line-item flow.
  - Add purchase date, bill number, remarks, and an optional attachment field for supplier bill image or file reference.
  - Keep supplier selection and multi-line item entry.

- `PurchasesPage`
  - Continue listing purchases and linking to material detail.

- `AlertsPage`
  - Continue listing low-stock alerts.
  - Low-stock should remain tied to the reorder level on the material record.

API Changes
- Keep the current inventory routes, but extend payloads and responses to include the new raw material fields.
- Material endpoints should support:
  - create material
  - list materials
  - get material detail
  - update material
  - adjust stock with reason and actor metadata
  - list transactions
  - list prices
  - list purchases for a material
- Purchase endpoints should support purchase metadata and continue to update stock through a transaction.

Stock Rules
- Current stock is derived from the sum of stock transactions, as it is now.
- The current `PurchaseCreate` flow is the purchase receipt entry point and increases stock.
- Manual adjustments can increase or decrease stock, but only for Admin or Manager.
- Low stock is triggered when current stock is at or below the reorder level.
- Available quantity should continue to be computed from the stock ledger rather than stored independently.

Audit Trail
- Record these actions with user and timestamp:
  - material.create
  - material.update
  - material.adjust_stock
  - purchase.create
- Keep the audit log lightweight and attached to the existing action flow.

Permissions
- Admin: full access.
- Factory Manager: create, edit, approve purchases, adjust stock.
- Inventory Staff: create purchases, view stock, update through allowed stock flows.
- Production Staff: read-only access in this pass.
- Accountant: read-only access to inventory data and purchase cost.
- Viewer: read-only access.

Implementation Notes
- Prefer the smallest change that fits the current code.
- Reuse the existing inventory repository and controller structure rather than adding a new domain layer.
- Keep the current MERLIN Lite page style and components.
- If a field is not yet present in the data model, add it only when the UI or stock flow needs it in this pass.

Acceptance Criteria
- User can create raw material items.
- User can categorize materials.
- User can purchase raw materials from suppliers.
- Stock increases after purchase receipt.
- Purchase metadata such as bill number and remarks can be captured.
- Low stock alert works from the reorder level.
- Stock adjustment requires a reason.
- Audit trail records create, update, purchase, and adjustment actions.
- The UI matches the current MERLIN Lite inventory page style.
