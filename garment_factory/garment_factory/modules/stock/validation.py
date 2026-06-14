"""Validation rules for stock transactions."""

from __future__ import annotations

from ...inventory_domain import compute_current_stock


def validate_stock_transactions(transactions: list[dict[str, object]]) -> dict[str, object]:
    return {
        "current_stock": compute_current_stock(transactions),
        "transaction_count": len(transactions),
    }

