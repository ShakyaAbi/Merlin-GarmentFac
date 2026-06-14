"""Controller-style entry points for low-stock alerts."""

from __future__ import annotations

from typing import Any

from .repository import AlertQuery
from .service import alert_state, list_alert_records


def list_(skip: int = 0, take: int = 50, acknowledged: bool | None = None) -> dict[str, Any]:
    return list_alert_records(AlertQuery(skip=skip, take=take, acknowledged=acknowledged))


def summary(transactions: list[dict[str, object]], minimum_stock: float) -> dict[str, object]:
    return alert_state(transactions, minimum_stock)


def acknowledge(alert_id: str) -> dict[str, object]:
    return {"id": alert_id, "acknowledged": True}
