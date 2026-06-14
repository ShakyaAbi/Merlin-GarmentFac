"""Authorization blueprint for the garment factory app."""

from __future__ import annotations

ROLE_CAPABILITIES = {
    "System Administrator": {"*"},
    "Factory Manager": {"inventory", "production", "sales", "reports", "expenses"},
    "Inventory Staff": {"raw_materials", "purchases", "stock"},
    "Production Staff": {"production_orders", "material_consumption", "finished_goods"},
    "Sales Staff": {"customers", "sales_orders", "sales_invoices"},
    "Accountant": {"expenses", "reports", "financial_view"},
    "Viewer": {"read_only"},
}


def can(role: str, capability: str) -> bool:
    """Return whether a role is allowed to perform a capability."""

    allowed = ROLE_CAPABILITIES.get(role, set())
    return "*" in allowed or capability in allowed


def capabilities_for(role: str) -> set[str]:
    """Return the declared capability set for a role."""

    return set(ROLE_CAPABILITIES.get(role, set()))
