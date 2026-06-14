"""Repository contract for raw material categories."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class CategoryQuery:
    skip: int = 0
    take: int = 50


def create_category(record: dict[str, Any]) -> dict[str, Any]:
    return dict(record)


def list_categories(query: CategoryQuery | None = None) -> dict[str, Any]:
    query = query or CategoryQuery()
    return {"data": [], "total": 0, **asdict(query)}

