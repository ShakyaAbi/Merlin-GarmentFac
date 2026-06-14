"""Business logic for material categories."""

from __future__ import annotations

from typing import Any

from .repository import CategoryQuery, create_category, list_categories
from .validation import validate_category


def create_category_record(payload: dict[str, object]) -> dict[str, object]:
    normalized = validate_category(payload)
    return create_category(normalized)


def list_category_records(query: CategoryQuery | None = None) -> dict[str, Any]:
    return list_categories(query)

