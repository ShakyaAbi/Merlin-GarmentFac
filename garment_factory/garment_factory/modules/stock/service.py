"""Business logic for stock tracking."""

from __future__ import annotations

from typing import Any

from .repository import StockQuery, list_stock_transactions
from .validation import validate_stock_transactions


def summarize_stock(transactions: list[dict[str, object]]) -> dict[str, object]:
    return validate_stock_transactions(transactions)


def list_stock_records(query: StockQuery | None = None) -> dict[str, Any]:
    return list_stock_transactions(query)

