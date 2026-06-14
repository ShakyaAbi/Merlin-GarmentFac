from decimal import Decimal
import unittest

from garment_factory.garment_factory.inventory_domain import (
    build_purchase_receipt,
    compute_current_stock,
    compute_weighted_average_unit_cost,
    validate_raw_material_record,
    validate_supplier_record,
)


class TestInventoryDomain(unittest.TestCase):
    def test_validate_supplier_record_requires_name_and_phone(self):
        supplier = validate_supplier_record({"name": "ACME", "phone": "9811111111"})
        self.assertEqual(supplier.name, "ACME")
        self.assertEqual(supplier.status, "ACTIVE")

    def test_validate_supplier_record_rejects_invalid_email(self):
        with self.assertRaises(ValueError):
            validate_supplier_record({"name": "ACME", "phone": "9811111111", "email": "bad"})

    def test_validate_raw_material_record_requires_unit_and_uses_allowed_categories(self):
        material = validate_raw_material_record(
            {"name": "Cotton Fabric", "unit": "meter", "category": "Fabric", "minimum_stock_level": 5}
        )
        self.assertEqual(material.category, "Fabric")
        self.assertEqual(material.minimum_stock_level, 5.0)

    def test_validate_raw_material_record_rejects_unknown_unit(self):
        with self.assertRaises(ValueError):
            validate_raw_material_record({"name": "Cotton Fabric", "unit": "yard"})

    def test_compute_current_stock_sums_transactions(self):
        self.assertEqual(
            compute_current_stock([{"change": 10}, {"change": -3}, {"change": 5}]),
            12.0,
        )

    def test_compute_weighted_average_unit_cost(self):
        avg = compute_weighted_average_unit_cost(10, Decimal("20"), 10, Decimal("30"))
        self.assertEqual(avg, Decimal("25"))

    def test_build_purchase_receipt_calculates_totals(self):
        receipt = build_purchase_receipt(
            {"name": "ACME", "phone": "9811111111"},
            [
                {"raw_material": "FAB-001", "quantity": 10, "unit_cost": "20", "unit": "meter"},
                {"raw_material": "BTN-001", "quantity": 5, "unit_cost": 2, "unit": "piece"},
            ],
            invoice_number="INV-001",
            purchase_date="2026-06-08",
            notes="Incoming stock",
        )

        self.assertEqual(receipt.supplier, "ACME")
        self.assertEqual(receipt.total_amount, Decimal("210"))
        self.assertEqual(receipt.lines[0].line_total, Decimal("200"))

    def test_build_purchase_receipt_rejects_inactive_supplier(self):
        with self.assertRaises(ValueError):
            build_purchase_receipt(
                {"name": "ACME", "phone": "9811111111", "status": "INACTIVE"},
                [{"raw_material": "FAB-001", "quantity": 10, "unit_cost": 20, "unit": "meter"}],
                purchase_date="2026-06-08",
            )
