"""Controller-style entry points for supplier management."""

from __future__ import annotations

from typing import Any

from .repository import SupplierQuery
from .service import (
    create_supplier_record,
    get_supplier_record,
    list_supplier_records,
    update_supplier_record,
)


def create(payload: dict[str, object]) -> dict[str, object]:
    return create_supplier_record(payload)


def list_(skip: int = 0, take: int = 50, search: str | None = None) -> dict[str, Any]:
    return list_supplier_records(SupplierQuery(skip=skip, take=take, search=search))


def get(supplier_id: str) -> dict[str, Any] | None:
    return get_supplier_record(supplier_id)


def update(supplier_id: str, payload: dict[str, object]) -> dict[str, Any]:
    return update_supplier_record(supplier_id, payload)

