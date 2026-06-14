import json
from pathlib import Path
import unittest

from garment_factory.garment_factory.catalog import (
    custom_field_fixture_payload,
    item_group_fixture_payload,
    role_fixture_payload,
    warehouse_fixture_payload,
)


ROOT = Path(__file__).resolve().parents[1]


class TestFixtureGenerator(unittest.TestCase):
    def test_catalog_payloads_match_fixture_json(self):
        expected = {
            "roles.json": role_fixture_payload(),
            "item_groups.json": item_group_fixture_payload(),
            "warehouses.json": warehouse_fixture_payload(),
            "custom_fields.json": custom_field_fixture_payload(),
        }

        for name, payload in expected.items():
            with self.subTest(name=name):
                actual = json.loads((ROOT / "fixtures" / name).read_text(encoding="utf-8"))
                self.assertEqual(actual, payload)
