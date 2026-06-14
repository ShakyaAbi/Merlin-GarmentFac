import unittest

from garment_factory.garment_factory.app_contract import app_name, app_title, export_modules, export_routes, export_summary


class TestAppContract(unittest.TestCase):
    def test_app_identity_is_stable(self):
        self.assertEqual(app_name(), "garment_factory")
        self.assertEqual(app_title(), "Garment Factory")

    def test_export_summary_exposes_expected_counts(self):
        summary = export_summary()
        self.assertGreaterEqual(summary["module_count"], 6)
        self.assertGreaterEqual(summary["route_count"], 15)
        self.assertGreaterEqual(summary["custom_field_count"], 8)

    def test_exports_are_serializable_shapes(self):
        modules = export_modules()
        routes = export_routes()
        self.assertTrue(all("name" in module for module in modules))
        self.assertTrue(all("path" in route for route in routes))
