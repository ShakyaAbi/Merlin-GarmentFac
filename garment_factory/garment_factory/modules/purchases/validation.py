"""Validation rules for purchases."""

from __future__ import annotations

from ...inventory_domain import build_purchase_receipt
from ..raw_materials.service import _format_decimal


def validate_purchase(payload: dict[str, object]) -> dict[str, object]:
    supplier = payload.get("supplier") or {}
    lines = payload.get("lines") or []
    receipt = build_purchase_receipt(
        supplier,  # type: ignore[arg-type]
        lines,  # type: ignore[arg-type]
        purchase_date=str(payload.get("purchase_date") or ""),
        invoice_number=payload.get("invoice_number") if payload.get("invoice_number") else None,
        notes=payload.get("notes") if payload.get("notes") else None,
    )
    return {
        "supplier": receipt.supplier,
        "invoice_number": receipt.invoice_number,
        "purchase_date": receipt.purchase_date,
        "total_amount": _format_decimal(receipt.total_amount),
        "lines": [line.__dict__ for line in receipt.lines],
    }
