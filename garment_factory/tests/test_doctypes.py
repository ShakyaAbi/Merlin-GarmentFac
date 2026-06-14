import json
from pathlib import Path
import unittest


DOCTYPES_DIR = Path(__file__).resolve().parents[1] / "doctype"


class TestDocTypes(unittest.TestCase):
    def test_settings_doctype_has_expected_core_fields(self):
        data = json.loads(
            (DOCTYPES_DIR / "garment_factory_settings" / "garment_factory_settings.json").read_text(
                encoding="utf-8"
            )
        )
        fieldnames = {field["fieldname"] for field in data["fields"]}
        self.assertIn("company_name", fieldnames)
        self.assertIn("default_raw_warehouse", fieldnames)
        self.assertIn("low_stock_threshold", fieldnames)

    def test_low_stock_alert_doctype_has_expected_core_fields(self):
        data = json.loads(
            (DOCTYPES_DIR / "low_stock_alert" / "low_stock_alert.json").read_text(
                encoding="utf-8"
            )
        )
        fieldnames = {field["fieldname"] for field in data["fields"]}
        self.assertIn("raw_material", fieldnames)
        self.assertIn("current_stock", fieldnames)
        self.assertIn("minimum_stock", fieldnames)
