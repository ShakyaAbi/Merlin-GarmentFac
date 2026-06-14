"""Controller-style entry points for purchases."""

from __future__ import annotations

from typing import Any

from .repository import PurchaseQuery
from .service import create_purchase_record, list_purchase_records


def create(payload: dict[str, object]) -> dict[str, object]:
    return create_purchase_record(payload)


def list_(skip: int = 0, take: int = 50, supplier_id: str | None = None) -> dict[str, Any]:
    return list_purchase_records(PurchaseQuery(skip=skip, take=take, supplier_id=supplier_id))


def get(purchase_id: str) -> dict[str, object]:
    return {"id": purchase_id}
