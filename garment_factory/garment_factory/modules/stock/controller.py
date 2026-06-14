"""Controller-style entry points for stock tracking."""

from __future__ import annotations

from typing import Any

from .repository import StockQuery
from .service import list_stock_records, summarize_stock


def list_(skip: int = 0, take: int = 50, material_id: str | None = None) -> dict[str, Any]:
    return list_stock_records(StockQuery(skip=skip, take=take, material_id=material_id))


def summary(transactions: list[dict[str, object]]) -> dict[str, object]:
    return summarize_stock(transactions)

