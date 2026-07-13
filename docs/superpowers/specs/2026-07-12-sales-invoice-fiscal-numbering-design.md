# Sales Invoice Fiscal-Year Numbering Design

## Goal

Allow each organization to choose whether sales-invoice sequences restart for each fiscal year, while adding the seller identity fields needed on Nepal tax invoices and omitting website.

## Decision

Add an organization setting named `resetSalesInvoiceSequenceEachFiscalYear`, defaulting to `true` so existing organizations keep the current year-scoped behavior. When enabled, the sequence key includes Nepal's fiscal-year segment; when disabled, one organization-wide sales-invoice sequence is used. Existing document numbers are never rewritten and changing the setting affects only future allocations.

Invoice previews will read the next value without incrementing the sequence. Invoice creation/issue remains the only allocation point.

## Organization invoice profile

Store and expose: PAN/VAT/TPIN, registration number, address, city, district, province, postal code, country, phone, email, and invoice footer. Website is intentionally excluded. The settings UI will show these in an organization branding/invoice profile form and include the reset toggle with explanatory copy.

## Fiscal-year behavior

The fiscal-year segment is based on Nepal's Shrawan 1–Ashadh end income year. The visible invoice format remains `INV-<year>-<sequence>` for compatibility; only the sequence key behavior changes. The toggle is organization-scoped and is applied by the sales-invoice repository when previewing and allocating numbers.

## Validation and compatibility

All new profile strings are optional except organization name. The reset flag defaults true at the database level and in service fallbacks. Existing API consumers continue receiving `organization` as the name, with a separate explicit organization profile object for the new fields.

## Testing

Cover fiscal-year segment calculation, reset-on/reset-off sequence keys, non-consuming previews, organization update validation/round-trip, and settings UI source behavior. Run API type checking, focused tests, web tests, web build, and graphify update.
