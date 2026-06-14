"""Business logic for purchases."""

from __future__ import annotations

from typing import Any

from ..raw_materials.service import _format_decimal
from .repository import PurchaseQuery, create_purchase, list_purchases
from .validation import validate_purchase


def create_purchase_record(payload: dict[str, object]) -> dict[str, object]:
    normalized = validate_purchase(payload)
    normalized["total_amount"] = _format_decimal(normalized["total_amount"])
    return create_purchase(normalized)


def list_purchase_records(query: PurchaseQuery | None = None) -> dict[str, Any]:
    return list_purchases(query)
