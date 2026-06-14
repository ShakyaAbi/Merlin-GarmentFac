"""Pure business logic for garment factory workflows."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable


@dataclass(frozen=True)
class LowStockAlert:
    item_code: str
    current_stock: float
    minimum_stock: float

    @property
    def shortage(self) -> float:
        return self.minimum_stock - self.current_stock


def build_low_stock_alerts(items: Iterable[dict[str, Any]]) -> list[LowStockAlert]:
    """Return alert candidates for items below their minimum stock level."""

    alerts: list[LowStockAlert] = []
    for item in items:
        minimum_stock = float(item.get("minimum_stock_level") or item.get("minimum_stock") or 0)
        current_stock = float(item.get("current_stock") or 0)
        item_code = str(item.get("item_code") or item.get("name") or "")
        if not item_code or minimum_stock <= 0:
            continue
        if current_stock < minimum_stock:
            alerts.append(
                LowStockAlert(
                    item_code=item_code,
                    current_stock=current_stock,
                    minimum_stock=minimum_stock,
                )
            )
    return alerts


def build_work_order_stock_plan(work_order: dict[str, Any]) -> dict[str, Any]:
    """Build the stock consumption and manufacture plan for a work order."""

    production_item = work_order.get("production_item") or work_order.get("item_code")
    qty = float(work_order.get("qty") or 0)
    if not production_item:
        raise ValueError("work_order.production_item is required")
    if qty <= 0:
        raise ValueError("work_order.qty must be greater than zero")

    source_warehouse = work_order.get("source_warehouse")
    fg_warehouse = work_order.get("fg_warehouse")
    bom_items = work_order.get("bom_items") or []

    consumption = []
    for entry in bom_items:
        consumption.append(
            {
                "item_code": entry["item_code"],
                "qty": float(entry["qty"]),
                "uom": entry.get("uom", "Nos"),
                "s_warehouse": source_warehouse,
            }
        )

    manufacture = {
        "item_code": production_item,
        "qty": qty,
        "t_warehouse": fg_warehouse,
    }

    return {
        "work_order": work_order.get("name"),
        "consumption": consumption,
        "manufacture": manufacture,
    }
