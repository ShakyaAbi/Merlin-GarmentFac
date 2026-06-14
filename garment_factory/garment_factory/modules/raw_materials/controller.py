"""Controller-style entry points for raw material management."""

from __future__ import annotations

from typing import Any

from .repository import MaterialQuery
from .service import (
    average_cost,
    create_material_record,
    get_material_record,
    list_material_records,
    preview_purchase_receipt,
    stock_from_transactions,
    update_material_record,
)


def create(payload: dict[str, object]) -> dict[str, object]:
    return create_material_record(payload)


def list_(skip: int = 0, take: int = 50, search: str | None = None, category: str | None = None, status: str | None = None) -> dict[str, Any]:
    return list_material_records(
        MaterialQuery(skip=skip, take=take, search=search, category=category, status=status)
    )


def get(material_id: str) -> dict[str, Any] | None:
    return get_material_record(material_id)


def update(material_id: str, payload: dict[str, object]) -> dict[str, Any]:
    return update_material_record(material_id, payload)


def preview_purchase(
    supplier: dict[str, object],
    lines: list[dict[str, object]],
    *,
    purchase_date: str,
    invoice_number: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    return preview_purchase_receipt(
        supplier,
        lines,
        purchase_date=purchase_date,
        invoice_number=invoice_number,
        notes=notes,
    )


def adjust_stock(material_id: str, change: float, reason: str) -> dict[str, object]:
    if not reason.strip():
        raise ValueError("reason is required for stock adjustments")
    return {
        "material_id": material_id,
        "change": change,
        "reason": reason.strip(),
    }
