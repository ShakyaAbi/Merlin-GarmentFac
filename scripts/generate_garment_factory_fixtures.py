"""Regenerate garment_factory fixture JSON from the canonical catalog."""

from __future__ import annotations

import json
from pathlib import Path

from garment_factory.garment_factory.catalog import (
    custom_field_fixture_payload,
    item_group_fixture_payload,
    role_fixture_payload,
    warehouse_fixture_payload,
)


ROOT = Path(__file__).resolve().parents[1]
FIXTURE_DIR = ROOT / "garment_factory" / "fixtures"


def write_fixture(name: str, payload: list[dict[str, object]]) -> None:
    path = FIXTURE_DIR / name
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    FIXTURE_DIR.mkdir(parents=True, exist_ok=True)
    write_fixture("roles.json", role_fixture_payload())
    write_fixture("item_groups.json", item_group_fixture_payload())
    write_fixture("warehouses.json", warehouse_fixture_payload())
    write_fixture("custom_fields.json", custom_field_fixture_payload())


if __name__ == "__main__":
    main()
