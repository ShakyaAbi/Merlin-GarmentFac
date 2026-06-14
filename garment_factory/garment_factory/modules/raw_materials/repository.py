"""Repository contract for raw material management."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(frozen=True)
class MaterialQuery:
    skip: int = 0
    take: int = 50
    search: str | None = None
    category: str | None = None
    status: str | None = None


def create_material(record: dict[str, Any]) -> dict[str, Any]:
    return dict(record)


def list_materials(query: MaterialQuery | None = None) -> dict[str, Any]:
    query = query or MaterialQuery()
    return {"data": [], "total": 0, **asdict(query)}


def get_material(material_id: str) -> dict[str, Any] | None:
    return None


def update_material(material_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {"id": material_id, **payload}

