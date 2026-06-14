"""Repository contract for low-stock alerts."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class AlertQuery:
    skip: int = 0
    take: int = 50
    acknowledged: bool | None = None


def list_alerts(query: AlertQuery | None = None) -> dict[str, Any]:
    query = query or AlertQuery()
    return {"data": [], "total": 0, **asdict(query)}

