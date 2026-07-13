# Nepal VAT Invoice Layout Design

Date: 2026-07-12

## Goal

Make both sales and purchase invoice document previews match the compact Nepali VAT bill reference while preserving the existing data-entry workflow.

## Design

- Use one shared `InvoicePaperDocument` component for sales and purchases.
- Render a flat, ruled, print-first document with a centered `TAX INVOICE` heading.
- Show seller PAN, transaction date, invoice issue date, buyer/supplier details, payment mode, invoice number, S.N., H.S. Code, description, quantity, unit price, amount, VAT 13%, grand total, amount in words, and signature footer.
- Keep the digital page white and monochrome for reliable printing; do not bake in the photographed pink stationery color.
- Preserve existing workflow actions outside the paper document.
- Keep sales and purchase adapters responsible for mapping their party and item data into the shared component.

## VAT and data behavior

- Reuse the existing calculated subtotal, discount, taxable amount, VAT, and grand-total values.
- Display missing optional values as `-` or blank ruled fields.
- Use the buyer label for sales and supplier label for purchases.

## Verification

- Add focused render assertions for both invoice types.
- Run the relevant web test suite and production build.
- Refresh graphify after code changes.
