"""Repository contract for purchase tracking."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class PurchaseQuery:
    skip: int = 0
    take: int = 50
    supplier_id: str | None = None


def create_purchase(record: dict[str, Any]) -> dict[str, Any]:
    return dict(record)


def list_purchases(query: PurchaseQuery | None = None) -> dict[str, Any]:
    query = query or PurchaseQuery()
    return {"data": [], "total": 0, **asdict(query)}

