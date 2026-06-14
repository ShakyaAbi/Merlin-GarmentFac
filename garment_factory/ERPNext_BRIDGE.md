# Garment Factory to ERPNext Bridge

The monorepo already contains a working supplier/raw-material API stack under
`apps/api/src`. The `garment_factory` app is being prepared to mirror that
domain in Frappe/ERPNext terms rather than creating a competing inventory
model.

## Shared vocabulary

The canonical vocabulary lives in `garment_factory/garment_factory/catalog.py`
and is consumed by:

- fixture JSON
- test assertions
- the blueprint module

## Mapping to ERPNext concepts

- Supplier Management maps to ERPNext supplier records and purchase history
- Raw Material Management maps to ERPNext items, categories, stock levels, and
  stock transactions
- Production Support maps to BOMs, work orders, and stock entry flows

## Relationship to the current API code

The existing API module already contains:

- supplier routes, services, repositories, and tests
- raw material routes, services, repositories, and tests
- stock transaction logic and low-stock checks

The Frappe app should eventually mirror those behaviors with native ERPNext
DocTypes, fixtures, and hooks. Until the bench is available, this bridge file
documents the contract and keeps the app scaffold aligned with the API work.
