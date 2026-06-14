"""Repository contract for stock transactions."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class StockQuery:
    skip: int = 0
    take: int = 50
    material_id: str | None = None


def list_stock_transactions(query: StockQuery | None = None) -> dict[str, Any]:
    query = query or StockQuery()
    return {"data": [], "total": 0, **asdict(query)}

