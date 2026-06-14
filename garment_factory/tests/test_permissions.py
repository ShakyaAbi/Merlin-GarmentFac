import unittest

from garment_factory.garment_factory.permissions import (
    ROLE_CAPABILITIES,
    can,
    capabilities_for,
)


class TestPermissions(unittest.TestCase):
    def test_expected_roles_exist(self):
        self.assertEqual(
            set(ROLE_CAPABILITIES),
            {
                "System Administrator",
                "Factory Manager",
                "Inventory Staff",
                "Production Staff",
                "Sales Staff",
                "Accountant",
                "Viewer",
            },
        )

    def test_factory_manager_can_manage_inventory_and_reports(self):
        self.assertTrue(can("Factory Manager", "inventory"))
        self.assertTrue(can("Factory Manager", "reports"))
        self.assertFalse(can("Factory Manager", "read_only"))

    def test_viewer_is_read_only(self):
        self.assertEqual(capabilities_for("Viewer"), {"read_only"})
        self.assertFalse(can("Viewer", "sales_orders"))

    def test_system_admin_can_do_anything(self):
        self.assertTrue(can("System Administrator", "anything"))
