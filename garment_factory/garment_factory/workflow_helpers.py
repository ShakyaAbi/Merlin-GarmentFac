"""Workflow helpers for garment_factory production flows."""

from __future__ import annotations

from .domain import build_work_order_stock_plan

try:  # pragma: no cover - bench-only dependency
    import frappe  # type: ignore
except Exception:  # pragma: no cover - import guard for local scaffolding
    frappe = None  # type: ignore

def on_work_order_submit(doc, method=None) -> None:  # noqa: ANN001
    """Generate draft stock entry data from a submitted work order."""

    plan = build_work_order_stock_plan(doc.as_dict() if hasattr(doc, "as_dict") else dict(doc))
    if frappe is None:
        return plan

    consumption = frappe.get_doc(  # type: ignore[attr-defined]
        {
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Consumption for Manufacture",
            "purpose": "Material Consumption",
            "work_order": plan["work_order"],
            "items": plan["consumption"],
        }
    )
    manufacture = frappe.get_doc(  # type: ignore[attr-defined]
        {
            "doctype": "Stock Entry",
            "stock_entry_type": "Manufacture",
            "purpose": "Manufacture",
            "work_order": plan["work_order"],
            "items": [plan["manufacture"]],
        }
    )
    return {
        "consumption": consumption,
        "manufacture": manufacture,
    }
