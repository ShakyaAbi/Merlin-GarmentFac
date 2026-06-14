import unittest

from garment_factory.garment_factory.modules.alerts.controller import acknowledge
from garment_factory.garment_factory.modules.purchases.controller import get as get_purchase
from garment_factory.garment_factory.modules.raw_materials.controller import adjust_stock


class TestModuleEndpoints(unittest.TestCase):
    def test_adjust_stock_requires_reason(self):
        with self.assertRaises(ValueError):
            adjust_stock("MAT-1", 10, "   ")

    def test_purchase_get_returns_identifier_shape(self):
        self.assertEqual(get_purchase("PUR-1"), {"id": "PUR-1"})

    def test_alert_acknowledge_returns_shape(self):
        self.assertEqual(acknowledge("ALERT-1"), {"id": "ALERT-1", "acknowledged": True})
