"""Business logic for supplier management."""

from __future__ import annotations

from typing import Any

from .repository import SupplierQuery, create_supplier, get_supplier, list_suppliers, update_supplier
from .validation import validate_supplier


def create_supplier_record(payload: dict[str, object]) -> dict[str, object]:
    normalized = validate_supplier(payload)
    return create_supplier(normalized)


def list_supplier_records(query: SupplierQuery | None = None) -> dict[str, Any]:
    return list_suppliers(query)


def get_supplier_record(supplier_id: str) -> dict[str, Any] | None:
    return get_supplier(supplier_id)


def update_supplier_record(supplier_id: str, payload: dict[str, object]) -> dict[str, Any]:
    normalized = validate_supplier(payload)
    return update_supplier(supplier_id, normalized)

