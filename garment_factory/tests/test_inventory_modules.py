import unittest

from garment_factory.garment_factory.modules.alerts.controller import summary as alert_summary
from garment_factory.garment_factory.modules.categories.controller import create as create_category
from garment_factory.garment_factory.modules.categories.controller import list_ as list_categories
from garment_factory.garment_factory.modules.purchases.controller import create as create_purchase
from garment_factory.garment_factory.modules.stock.controller import summary as stock_summary


class TestInventoryModules(unittest.TestCase):
    def test_category_controller_round_trips_name(self):
        category = create_category({"name": "Fabric", "description": "Main cloth"})
        self.assertEqual(category["name"], "Fabric")

    def test_category_list_returns_expected_shape(self):
        data = list_categories()
        self.assertEqual(set(data), {"data", "total", "skip", "take"})

    def test_purchase_controller_uses_purchase_domain(self):
        purchase = create_purchase(
            {
                "supplier": {"name": "ACME", "phone": "9811111111"},
                "purchase_date": "2026-06-08",
                "lines": [{"raw_material": "FAB-001", "quantity": 4, "unit_cost": 5, "unit": "meter"}],
            }
        )
        self.assertEqual(purchase["total_amount"], "20")

    def test_stock_and_alert_summary_shapes(self):
        transactions = [{"change": 10}, {"change": -2}]
        self.assertEqual(stock_summary(transactions)["current_stock"], 8.0)
        self.assertTrue(alert_summary(transactions, 8)["needs_alert"])
