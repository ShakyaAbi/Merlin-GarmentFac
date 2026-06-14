import unittest

from garment_factory.garment_factory.blueprint import MODULES, all_reference_values


class TestBlueprint(unittest.TestCase):
    def test_modules_cover_supplier_raw_material_and_production_support(self):
        self.assertEqual(
            [module.name for module in MODULES],
            [
                "Supplier Management",
                "Material Categories",
                "Raw Material Management",
                "Purchase Tracking",
                "Stock Tracking",
                "Alerting",
                "Production Support",
            ],
        )

    def test_reference_values_expose_the_expected_vocabulary(self):
        values = all_reference_values()
        self.assertIn("Factory Manager", values["roles"])
        self.assertIn("Fabric", values["item_groups"])
        self.assertIn("meter", values["raw_material_units"])
        self.assertIn("Raw Material Warehouse", values["warehouses"])
