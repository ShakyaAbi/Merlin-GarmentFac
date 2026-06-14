"""Canonical garment factory app definitions.

This module centralizes the core business vocabulary so the JSON fixtures and
future Frappe exports can be generated and verified from one place.
"""

from __future__ import annotations

from dataclasses import dataclass


ROLES = (
    "Factory Manager",
    "Inventory Staff",
    "Production Staff",
    "Sales Staff",
    "Accountant",
    "Viewer",
)

ITEM_GROUPS = (
    "Fabric",
    "Thread",
    "Button",
    "Zipper",
    "Label",
    "Packaging",
    "Elastic",
    "Accessories",
)

RAW_MATERIAL_CATEGORIES = ITEM_GROUPS
RAW_MATERIAL_UNITS = ("meter", "kg", "roll", "piece", "packet")

WAREHOUSES = (
    "Raw Material Warehouse",
    "WIP Warehouse",
    "Finished Goods Warehouse",
    "Damaged Warehouse",
)


@dataclass(frozen=True)
class CustomFieldSpec:
    doctype: str
    fieldname: str
    label: str
    fieldtype: str
    options: str | None = None

    def as_dict(self) -> dict[str, str]:
        payload: dict[str, str] = {
            "doctype": "Custom Field",
            "dt": self.doctype,
            "fieldname": self.fieldname,
            "label": self.label,
            "fieldtype": self.fieldtype,
        }
        if self.options is not None:
            payload["options"] = self.options
        return payload


CUSTOM_FIELDS = (
    CustomFieldSpec("Supplier", "pan_vat_number", "PAN/VAT Number", "Data"),
    CustomFieldSpec(
        "Item",
        "material_type",
        "Material Type",
        "Select",
        "\nFabric\nThread\nButton\nZipper\nLabel\nPackaging\nAccessories\nOther",
    ),
    CustomFieldSpec("Item", "minimum_stock_level", "Minimum Stock Level", "Float"),
    CustomFieldSpec("BOM", "wastage_percentage", "Wastage Percentage", "Float"),
    CustomFieldSpec("Work Order", "production_line", "Production Line", "Data"),
    CustomFieldSpec("Sales Invoice", "customer_pan", "Customer PAN", "Data"),
    CustomFieldSpec("Sales Invoice", "fiscal_year", "Fiscal Year", "Data"),
    CustomFieldSpec("Sales Invoice", "printed_count", "Printed Count", "Int"),
    CustomFieldSpec("Sales Invoice", "sync_status", "Sync Status", "Data"),
)


def make_frappe_fixture_filter(fieldname: str, values: tuple[str, ...]) -> dict[str, object]:
    return {
        "dt": fieldname,
        "filters": [[f"{fieldname.lower()}_name", "in", list(values)]],
    }


def role_fixture_payload() -> list[dict[str, str]]:
    return [{"doctype": "Role", "role_name": role} for role in ROLES]


def item_group_fixture_payload() -> list[dict[str, str]]:
    return [{"doctype": "Item Group", "item_group_name": group} for group in ITEM_GROUPS]


def warehouse_fixture_payload() -> list[dict[str, str]]:
    return [{"doctype": "Warehouse", "warehouse_name": warehouse} for warehouse in WAREHOUSES]


def custom_field_fixture_payload() -> list[dict[str, str]]:
    return [field.as_dict() for field in CUSTOM_FIELDS]
