# Garment Factory Bench Runbook

This repository contains a scaffolded Frappe app named `garment_factory`.
The current tree is intentionally bench-safe: it can be imported and tested
without a live ERPNext site, and it includes canonical JSON fixtures plus pure
Python domain logic for suppliers, raw materials, stock planning, and role
mapping.

## What is included now

- App metadata and packaging files
- Canonical catalog definitions in `garment_factory/garment_factory/catalog.py`
- Pure domain helpers for:
  - supplier validation
  - raw material validation
  - purchase receipt planning
  - stock calculation
  - low-stock alert planning
  - work-order stock-plan calculation
- DocType JSON stubs for:
  - `Garment Factory Settings`
  - `Low Stock Alert`
- Fixture JSON for roles, item groups, warehouses, and custom fields

## What still requires a real bench

- Importing the app into ERPNext/Frappe
- Creating actual Frappe DocType records
- Mounting routes and controllers into a live ERPNext site
- Persisting purchases, stock movements, and alerts to the database

## Regenerate fixtures

The fixture JSON is generated from the canonical catalog:

```bash
python scripts/generate_garment_factory_fixtures.py
```

Run this after editing `garment_factory/garment_factory/catalog.py`.

## Local verification

Run the Python checks from the repo root:

```bash
python -m compileall garment_factory scripts
python -m unittest discover -s garment_factory/tests
```

## Bench install outline

When you have a Frappe bench/site available:

1. Create or copy the `garment_factory` app into the bench apps directory.
2. Install the app on the target site.
3. Load the fixtures from this repository.
4. Export the generated Frappe fixtures once the DocTypes and custom fields are
   registered in the site.
5. Wire controllers, routes, and permissions into the live ERPNext app.

## Suggested next implementation slice

The next practical slice is to convert the supplier and raw material blueprints
into live Frappe DocType/controller code once a bench site is available.
