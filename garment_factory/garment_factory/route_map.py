"""Canonical inventory route map for the garment factory app.

This mirrors the working inventory routes in the monorepo API layer and gives
the Frappe scaffold a stable contract for future controller wiring.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RouteSpec:
    method: str
    path: str
    controller: str
    roles: tuple[str, ...] = ()


INVENTORY_ROUTES = (
    RouteSpec("GET", "/inventory/suppliers", "suppliers.list"),
    RouteSpec("POST", "/inventory/suppliers", "suppliers.create", ("System Administrator", "Factory Manager")),
    RouteSpec("GET", "/inventory/suppliers/:id", "suppliers.get"),
    RouteSpec("PUT", "/inventory/suppliers/:id", "suppliers.update", ("System Administrator", "Factory Manager")),
    RouteSpec("GET", "/inventory/material-categories", "categories.list"),
    RouteSpec("POST", "/inventory/material-categories", "categories.create", ("System Administrator", "Factory Manager")),
    RouteSpec("GET", "/inventory/materials", "raw_materials.list"),
    RouteSpec("POST", "/inventory/materials", "raw_materials.create", ("System Administrator", "Factory Manager")),
    RouteSpec("GET", "/inventory/materials/:id", "raw_materials.get"),
    RouteSpec("PUT", "/inventory/materials/:id", "raw_materials.update", ("System Administrator", "Factory Manager")),
    RouteSpec("PATCH", "/inventory/materials/:id/adjust-stock", "raw_materials.adjust_stock", ("System Administrator", "Factory Manager")),
    RouteSpec("GET", "/inventory/materials/:id/transactions", "stock.list"),
    RouteSpec("GET", "/inventory/materials/:id/purchases", "purchases.list_for_material"),
    RouteSpec("POST", "/inventory/purchases", "purchases.create", ("System Administrator", "Factory Manager")),
    RouteSpec("GET", "/inventory/purchases/:id", "purchases.get"),
    RouteSpec("GET", "/inventory/alerts", "alerts.list"),
    RouteSpec("POST", "/inventory/alerts/:id/ack", "alerts.acknowledge", ("System Administrator", "Factory Manager")),
    RouteSpec("GET", "/inventory/alerts/summary", "alerts.summary"),
)


def group_routes() -> dict[str, list[RouteSpec]]:
    grouped: dict[str, list[RouteSpec]] = {}
    for route in INVENTORY_ROUTES:
        resource = route.path.split("/")[2]
        grouped.setdefault(resource, []).append(route)
    return grouped


def route_paths() -> tuple[str, ...]:
    return tuple(route.path for route in INVENTORY_ROUTES)

