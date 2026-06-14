"""Scheduler jobs for the garment_factory module."""

from __future__ import annotations

from .domain import build_low_stock_alerts

try:  # pragma: no cover - bench-only dependency
    import frappe  # type: ignore
except Exception:  # pragma: no cover - import guard for local scaffolding
    frappe = None  # type: ignore

def run_low_stock_check() -> None:
    """Create low-stock alerts for items below their minimum threshold.

    In the current repo state this is bench-safe: when Frappe is unavailable it
    simply returns an empty list. In a live site it scans Item stock levels and
    creates `Low Stock Alert` documents for unacknowledged shortages.
    """

    if frappe is None:
        return []

    items = frappe.get_all(  # type: ignore[attr-defined]
        "Item",
        fields=["name", "minimum_stock_level"],
        filters=[["minimum_stock_level", ">", 0]],
    )
    stock_rows = []
    for item in items:
        current_stock = frappe.db.sql(  # type: ignore[attr-defined]
            "SELECT COALESCE(SUM(actual_qty), 0) FROM `tabBin` WHERE item_code = %s",
            (item.name,),
        )[0][0]
        stock_rows.append(
            {
                "item_code": item.name,
                "current_stock": current_stock,
                "minimum_stock_level": item.minimum_stock_level,
            }
        )

    alerts = build_low_stock_alerts(stock_rows)
    created = []
    for alert in alerts:
        if frappe.db.exists(  # type: ignore[attr-defined]
            "Low Stock Alert",
            {"raw_material": alert.item_code, "acknowledged": 0},
        ):
            continue
        doc = frappe.get_doc(  # type: ignore[attr-defined]
            {
                "doctype": "Low Stock Alert",
                "raw_material": alert.item_code,
                "current_stock": alert.current_stock,
                "minimum_stock": alert.minimum_stock,
                "acknowledged": 0,
            }
        )
        created.append(doc.insert(ignore_permissions=True))

    return created
