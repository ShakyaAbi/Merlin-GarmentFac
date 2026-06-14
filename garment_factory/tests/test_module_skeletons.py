import unittest

from garment_factory.garment_factory.modules.raw_materials.controller import preview_purchase
from garment_factory.garment_factory.modules.raw_materials.service import stock_from_transactions
from garment_factory.garment_factory.modules.suppliers.controller import create as create_supplier
from garment_factory.garment_factory.modules.suppliers.controller import list_ as list_suppliers


class TestModuleSkeletons(unittest.TestCase):
    def test_supplier_controller_normalizes_and_returns_payload(self):
        payload = create_supplier({"name": "ACME", "phone": "9811111111"})
        self.assertEqual(payload["name"], "ACME")
        self.assertEqual(payload["status"], "ACTIVE")

    def test_supplier_list_returns_pagination_shape(self):
        data = list_suppliers()
        self.assertEqual(set(data), {"data", "total", "skip", "take", "search"})

    def test_raw_material_preview_purchase_shapes_receipt(self):
        receipt = preview_purchase(
            {"name": "ACME", "phone": "9811111111"},
            [{"raw_material": "FAB-001", "quantity": 3, "unit_cost": 10, "unit": "meter"}],
            purchase_date="2026-06-08",
        )
        self.assertEqual(receipt["total_amount"], "30")

    def test_stock_from_transactions_delegates_to_domain(self):
        self.assertEqual(stock_from_transactions([{"change": 1}, {"change": 2}]), 3.0)
