"""Validation rules for low-stock alerts."""

from __future__ import annotations

from ...inventory_domain import compute_current_stock


def validate_alert_state(transactions: list[dict[str, object]], minimum_stock: float) -> dict[str, object]:
    current_stock = compute_current_stock(transactions)
    return {
        "current_stock": current_stock,
        "minimum_stock": float(minimum_stock),
        "needs_alert": current_stock <= float(minimum_stock),
    }

