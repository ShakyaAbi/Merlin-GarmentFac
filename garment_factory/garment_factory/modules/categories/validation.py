"""Validation rules for material categories."""

from __future__ import annotations


def validate_category(payload: dict[str, object]) -> dict[str, object]:
    name = str(payload.get("name") or "").strip()
    if not name:
        raise ValueError("category.name is required")
    return {
        "name": name,
        "description": str(payload.get("description") or "").strip() or None,
    }

