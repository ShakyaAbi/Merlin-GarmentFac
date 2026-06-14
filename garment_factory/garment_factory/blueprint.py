"""High-level module blueprint for the garment factory app.

This is intentionally a pure-data layer that mirrors the live inventory
implementation already present in the monorepo under `apps/api/src`. It gives
the Frappe app a stable contract for future controller and DocType generation.
"""

from __future__ import annotations

from dataclasses import dataclass

from .catalog import (
    CUSTOM_FIELDS,
    ITEM_GROUPS,
    RAW_MATERIAL_CATEGORIES,
    RAW_MATERIAL_UNITS,
    ROLES,
    WAREHOUSES,
)


@dataclass(frozen=True)
class ModuleBlueprint:
    name: str
    purpose: str
    entities: tuple[str, ...]


MODULES = (
    ModuleBlueprint(
        name="Supplier Management",
        purpose="Maintain vendor records for procurement and purchase history.",
        entities=("Supplier", "Purchase"),
    ),
    ModuleBlueprint(
        name="Material Categories",
        purpose="Organize raw materials into ERP-style item groups.",
        entities=("Item Group", "Raw Material Category"),
    ),
    ModuleBlueprint(
        name="Raw Material Management",
        purpose="Track material catalogs, stock, stock movements, and alerts.",
        entities=("Item", "Raw Material Category", "Stock Transaction", "Low Stock Alert"),
    ),
    ModuleBlueprint(
        name="Purchase Tracking",
        purpose="Represent incoming purchase receipts and line items.",
        entities=("Purchase", "Purchase Item"),
    ),
    ModuleBlueprint(
        name="Stock Tracking",
        purpose="Represent the ledger of quantity changes and balances.",
        entities=("Stock Transaction", "Low Stock Alert"),
    ),
    ModuleBlueprint(
        name="Alerting",
        purpose="Track low-stock alerts and acknowledgement flows.",
        entities=("Low Stock Alert",),
    ),
    ModuleBlueprint(
        name="Production Support",
        purpose="Prepare for BOM and work-order driven consumption flows.",
        entities=("BOM", "Work Order", "Stock Entry"),
    ),
)


def all_reference_values() -> dict[str, tuple[str, ...]]:
    """Return the canonical app vocabulary in one place."""

    return {
        "roles": ROLES,
        "item_groups": ITEM_GROUPS,
        "raw_material_categories": RAW_MATERIAL_CATEGORIES,
        "raw_material_units": RAW_MATERIAL_UNITS,
        "warehouses": WAREHOUSES,
        "custom_fields": tuple(f"{field.doctype}.{field.fieldname}" for field in CUSTOM_FIELDS),
    }
