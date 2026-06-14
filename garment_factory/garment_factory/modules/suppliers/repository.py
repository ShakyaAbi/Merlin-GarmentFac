"""Repository contract for supplier management."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class SupplierQuery:
    skip: int = 0
    take: int = 50
    search: str | None = None


def create_supplier(record: dict[str, Any]) -> dict[str, Any]:
    """Persist a supplier record in the future Frappe layer.

    This stub returns the normalized payload for now so the module can be
    exercised without a live site.
    """

    return dict(record)


def list_suppliers(query: SupplierQuery | None = None) -> dict[str, Any]:
    query = query or SupplierQuery()
    return {"data": [], "total": 0, **asdict(query)}


def get_supplier(supplier_id: str) -> dict[str, Any] | None:
    return None


def update_supplier(supplier_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {"id": supplier_id, **payload}

