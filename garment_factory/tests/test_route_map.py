import unittest

from garment_factory.garment_factory.route_map import INVENTORY_ROUTES, group_routes, route_paths


class TestRouteMap(unittest.TestCase):
    def test_route_paths_match_inventory_surface(self):
        self.assertIn("/inventory/suppliers", route_paths())
        self.assertIn("/inventory/materials/:id/adjust-stock", route_paths())
        self.assertIn("/inventory/alerts/summary", route_paths())

    def test_group_routes_groups_by_inventory_resource(self):
        grouped = group_routes()
        self.assertIn("suppliers", grouped)
        self.assertIn("materials", grouped)
        self.assertIn("alerts", grouped)

    def test_route_count_covers_the_known_inventory_surface(self):
        self.assertGreaterEqual(len(INVENTORY_ROUTES), 15)
