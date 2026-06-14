"""Top-level contract for the garment_factory app.

This module provides a single export surface for documentation, future Frappe
integration, and bench-side generation scripts.
"""

from __future__ import annotations

from dataclasses import asdict

from .blueprint import MODULES, all_reference_values
from .catalog import CUSTOM_FIELDS, ITEM_GROUPS, RAW_MATERIAL_CATEGORIES, RAW_MATERIAL_UNITS, ROLES, WAREHOUSES
from .route_map import INVENTORY_ROUTES


def app_name() -> str:
    return "garment_factory"


def app_title() -> str:
    return "Garment Factory"


def export_summary() -> dict[str, object]:
    return {
        "app_name": app_name(),
        "app_title": app_title(),
        "module_count": len(MODULES),
        "route_count": len(INVENTORY_ROUTES),
        "role_count": len(ROLES),
        "item_group_count": len(ITEM_GROUPS),
        "raw_material_category_count": len(RAW_MATERIAL_CATEGORIES),
        "raw_material_unit_count": len(RAW_MATERIAL_UNITS),
        "warehouse_count": len(WAREHOUSES),
        "custom_field_count": len(CUSTOM_FIELDS),
        "reference_values": all_reference_values(),
    }


def export_modules() -> list[dict[str, object]]:
    return [asdict(module) for module in MODULES]


def export_routes() -> list[dict[str, object]]:
    return [asdict(route) for route in INVENTORY_ROUTES]

