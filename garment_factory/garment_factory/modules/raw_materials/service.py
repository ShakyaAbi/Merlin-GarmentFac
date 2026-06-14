"""Business logic for raw material management."""

from __future__ import annotations

from typing import Any

from ...inventory_domain import (
    build_purchase_receipt,
    compute_current_stock,
    compute_weighted_average_unit_cost,
)
from .repository import MaterialQuery, create_material, get_material, list_materials, update_material
from .validation import validate_raw_material


def _format_decimal(value: object) -> str:
    if hasattr(value, "normalize"):
        normalized = value.normalize()
        text = format(normalized, "f")
        return text.rstrip("0").rstrip(".") if "." in text else text
    return str(value)


def create_material_record(payload: dict[str, object]) -> dict[str, object]:
    normalized = validate_raw_material(payload)
    return create_material(normalized)


def list_material_records(query: MaterialQuery | None = None) -> dict[str, Any]:
    return list_materials(query)


def get_material_record(material_id: str) -> dict[str, Any] | None:
    return get_material(material_id)


def update_material_record(material_id: str, payload: dict[str, object]) -> dict[str, Any]:
    normalized = validate_raw_material(payload)
    return update_material(material_id, normalized)


def preview_purchase_receipt(
    supplier: dict[str, object],
    lines: list[dict[str, object]],
    *,
    purchase_date: str,
    invoice_number: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    receipt = build_purchase_receipt(
        supplier,
        lines,
        purchase_date=purchase_date,
        invoice_number=invoice_number,
        notes=notes,
    )
    return {
        "supplier": receipt.supplier,
        "invoice_number": receipt.invoice_number,
        "purchase_date": receipt.purchase_date,
        "total_amount": _format_decimal(receipt.total_amount),
        "lines": [
            {
                "raw_material": line.raw_material,
                "quantity": line.quantity,
                "unit_cost": _format_decimal(line.unit_cost),
                "line_total": _format_decimal(line.line_total),
                "unit": line.unit,
            }
            for line in receipt.lines
        ],
    }


def stock_from_transactions(transactions: list[dict[str, object]]) -> float:
    return compute_current_stock(transactions)


def average_cost(
    existing_stock: float,
    existing_average_cost: float | int | object,
    purchase_quantity: float,
    purchase_unit_cost: float | int | object,
) -> str:
    return _format_decimal(
        compute_weighted_average_unit_cost(
            existing_stock,
            existing_average_cost,
            purchase_quantity,
            purchase_unit_cost,
        )
    )
