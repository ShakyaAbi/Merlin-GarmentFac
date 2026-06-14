"""Controller-style entry points for material categories."""

from __future__ import annotations

from typing import Any

from .repository import CategoryQuery
from .service import create_category_record, list_category_records


def create(payload: dict[str, object]) -> dict[str, object]:
    return create_category_record(payload)


def list_(skip: int = 0, take: int = 50) -> dict[str, Any]:
    return list_category_records(CategoryQuery(skip=skip, take=take))

