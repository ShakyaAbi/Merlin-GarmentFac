import unittest

from garment_factory.garment_factory.domain import (
    build_low_stock_alerts,
    build_work_order_stock_plan,
)
from garment_factory.garment_factory.scheduler import run_low_stock_check
from garment_factory.garment_factory.workflow_helpers import on_work_order_submit


class TestDomainHelpers(unittest.TestCase):
    def test_low_stock_alerts_only_include_items_below_threshold(self):
        alerts = build_low_stock_alerts(
            [
                {"item_code": "FAB-001", "current_stock": 10, "minimum_stock_level": 12},
                {"item_code": "BTN-001", "current_stock": 20, "minimum_stock_level": 10},
                {"name": "ZIP-001", "current_stock": 1, "minimum_stock": 3},
            ]
        )

        self.assertEqual([a.item_code for a in alerts], ["FAB-001", "ZIP-001"])
        self.assertEqual(alerts[0].shortage, 2)
        self.assertEqual(alerts[1].shortage, 2)

    def test_work_order_stock_plan_builds_consumption_and_manufacture_entries(self):
        plan = build_work_order_stock_plan(
            {
                "name": "WO-0001",
                "production_item": "TSHIRT-001",
                "qty": 50,
                "source_warehouse": "Raw Material Warehouse",
                "fg_warehouse": "Finished Goods Warehouse",
                "bom_items": [
                    {"item_code": "FAB-001", "qty": 75, "uom": "Meter"},
                    {"item_code": "LBL-001", "qty": 50},
                ],
            }
        )

        self.assertEqual(plan["work_order"], "WO-0001")
        self.assertEqual(plan["manufacture"]["item_code"], "TSHIRT-001")
        self.assertEqual(plan["manufacture"]["qty"], 50)
        self.assertEqual(plan["consumption"][0]["s_warehouse"], "Raw Material Warehouse")
        self.assertEqual(plan["consumption"][1]["uom"], "Nos")

    def test_work_order_stock_plan_requires_item_and_quantity(self):
        with self.assertRaises(ValueError):
            build_work_order_stock_plan({"qty": 0})

    def test_scheduler_returns_empty_list_without_frappe(self):
        self.assertEqual(run_low_stock_check(), [])

    def test_work_order_hook_returns_plan_without_frappe(self):
        plan = on_work_order_submit(
            {
                "name": "WO-0002",
                "production_item": "TSHIRT-002",
                "qty": 10,
                "bom_items": [{"item_code": "FAB-002", "qty": 15}],
            }
        )
        self.assertEqual(plan["work_order"], "WO-0002")
        self.assertEqual(plan["manufacture"]["item_code"], "TSHIRT-002")
