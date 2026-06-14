"""Validation rules for raw material management."""

from __future__ import annotations

from ...inventory_domain import validate_raw_material_record


def validate_raw_material(payload: dict[str, object]) -> dict[str, object]:
    record = validate_raw_material_record(payload)
    return {
        "name": record.name,
        "unit": record.unit,
        "category": record.category,
        "sku": record.sku,
        "opening_stock": record.opening_stock,
        "minimum_stock_level": record.minimum_stock_level,
        "unit_cost": record.unit_cost,
        "notes": record.notes,
        "status": record.status,
    }

