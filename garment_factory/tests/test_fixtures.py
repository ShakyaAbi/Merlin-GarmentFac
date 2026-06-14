import json
from pathlib import Path
import unittest

from garment_factory.garment_factory.catalog import (
    CUSTOM_FIELDS,
    ITEM_GROUPS,
    ROLES,
    WAREHOUSES,
)


FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures"


class TestFixtures(unittest.TestCase):
    def test_expected_fixture_files_exist(self):
        expected = {
            "roles.json",
            "item_groups.json",
            "warehouses.json",
            "custom_fields.json",
        }
        self.assertTrue(expected.issubset({path.name for path in FIXTURES_DIR.iterdir()}))

    def test_roles_fixture_contains_factory_roles(self):
        roles = json.loads((FIXTURES_DIR / "roles.json").read_text(encoding="utf-8"))
        self.assertEqual([row["role_name"] for row in roles], list(ROLES))

    def test_custom_fields_cover_invoice_and_supplier_fields(self):
        fields = json.loads((FIXTURES_DIR / "custom_fields.json").read_text(encoding="utf-8"))
        key_fields = {(row["dt"], row["fieldname"]) for row in fields}
        self.assertIn(("Supplier", "pan_vat_number"), key_fields)
        self.assertIn(("Sales Invoice", "sync_status"), key_fields)
        self.assertIn(("Sales Invoice", "printed_count"), key_fields)
        self.assertEqual(len(fields), len(CUSTOM_FIELDS))

    def test_catalog_matches_fixture_dimensions(self):
        self.assertEqual(list(ITEM_GROUPS), ["Fabric", "Thread", "Button", "Zipper", "Label", "Packaging", "Elastic", "Accessories"])
        self.assertEqual(list(WAREHOUSES), ["Raw Material Warehouse", "WIP Warehouse", "Finished Goods Warehouse", "Damaged Warehouse"])
