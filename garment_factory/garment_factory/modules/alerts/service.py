"""Business logic for low-stock alerts."""

from __future__ import annotations

from typing import Any

from .repository import AlertQuery, list_alerts
from .validation import validate_alert_state


def alert_state(transactions: list[dict[str, object]], minimum_stock: float) -> dict[str, object]:
    return validate_alert_state(transactions, minimum_stock)


def list_alert_records(query: AlertQuery | None = None) -> dict[str, Any]:
    return list_alerts(query)

