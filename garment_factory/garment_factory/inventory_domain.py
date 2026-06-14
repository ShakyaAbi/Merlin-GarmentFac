"""Pure inventory domain logic for garment factory workflows."""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from email.utils import parseaddr
from typing import Any

from .catalog import ITEM_GROUPS


SUPPLIER_STATUSES = ("ACTIVE", "INACTIVE")
MATERIAL_STATUSES = ("ACTIVE", "INACTIVE")
RAW_MATERIAL_UNITS = ("meter", "kg", "roll", "piece", "packet")


@dataclass(frozen=True)
class SupplierRecord:
    name: str
    phone: str
    contact_name: str | None = None
    email: str | None = None
    address: str | None = None
    pan_vat_number: str | None = None
    notes: str | None = None
    status: str = "ACTIVE"


@dataclass(frozen=True)
class RawMaterialRecord:
    name: str
    unit: str
    category: str | None = None
    sku: str | None = None
    opening_stock: float = 0.0
    minimum_stock_level: float = 0.0
    unit_cost: Decimal | None = None
    notes: str | None = None
    status: str = "ACTIVE"


@dataclass(frozen=True)
class PurchaseLine:
    raw_material: str
    quantity: float
    unit_cost: Decimal
    unit: str
    line_total: Decimal = field(init=False)

    def __post_init__(self) -> None:
        object.__setattr__(self, "line_total", Decimal(str(self.quantity)) * self.unit_cost)


@dataclass(frozen=True)
class PurchaseReceipt:
    supplier: str
    invoice_number: str | None
    purchase_date: str
    lines: list[PurchaseLine]
    notes: str | None = None

    @property
    def total_amount(self) -> Decimal:
        return sum((line.line_total for line in self.lines), start=Decimal("0"))


def _normalize_text(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _is_valid_email(value: str | None) -> bool:
    if not value:
        return True
    return "@" in parseaddr(value)[1]


def validate_supplier_record(payload: dict[str, Any]) -> SupplierRecord:
    name = _normalize_text(payload.get("name"))
    phone = _normalize_text(payload.get("phone"))
    if not name:
        raise ValueError("supplier.name is required")
    if not phone:
        raise ValueError("supplier.phone is required")

    email = _normalize_text(payload.get("email"))
    if not _is_valid_email(email):
        raise ValueError("supplier.email must be a valid email address")

    status = (payload.get("status") or "ACTIVE").strip().upper()
    if status not in SUPPLIER_STATUSES:
        raise ValueError(f"supplier.status must be one of {SUPPLIER_STATUSES}")

    return SupplierRecord(
        name=name,
        phone=phone,
        contact_name=_normalize_text(payload.get("contact_name")),
        email=email,
        address=_normalize_text(payload.get("address")),
        pan_vat_number=_normalize_text(payload.get("pan_vat_number")),
        notes=_normalize_text(payload.get("notes")),
        status=status,
    )


def validate_raw_material_record(payload: dict[str, Any]) -> RawMaterialRecord:
    name = _normalize_text(payload.get("name"))
    unit = _normalize_text(payload.get("unit"))
    if not name:
        raise ValueError("material.name is required")
    if not unit:
        raise ValueError("material.unit is required")
    if unit not in RAW_MATERIAL_UNITS:
        raise ValueError(f"material.unit must be one of {RAW_MATERIAL_UNITS}")

    category = _normalize_text(payload.get("category"))
    if category and category not in ITEM_GROUPS:
        raise ValueError(f"material.category must be one of {ITEM_GROUPS}")

    status = (payload.get("status") or "ACTIVE").strip().upper()
    if status not in MATERIAL_STATUSES:
        raise ValueError(f"material.status must be one of {MATERIAL_STATUSES}")

    opening_stock = float(payload.get("opening_stock") or 0)
    minimum_stock_level = float(payload.get("minimum_stock_level") or 0)
    if opening_stock < 0:
        raise ValueError("material.opening_stock cannot be negative")
    if minimum_stock_level < 0:
        raise ValueError("material.minimum_stock_level cannot be negative")

    unit_cost = payload.get("unit_cost")
    if unit_cost is not None:
        unit_cost = Decimal(str(unit_cost))

    return RawMaterialRecord(
        name=name,
        unit=unit,
        category=category,
        sku=_normalize_text(payload.get("sku")),
        opening_stock=opening_stock,
        minimum_stock_level=minimum_stock_level,
        unit_cost=unit_cost,
        notes=_normalize_text(payload.get("notes")),
        status=status,
    )


def compute_current_stock(transactions: list[dict[str, Any]]) -> float:
    return float(sum(float(transaction.get("change") or 0) for transaction in transactions))


def compute_weighted_average_unit_cost(
    existing_stock: float,
    existing_average_cost: Decimal | float | int,
    purchase_quantity: float,
    purchase_unit_cost: Decimal | float | int,
) -> Decimal:
    existing_stock_decimal = Decimal(str(existing_stock))
    existing_average = Decimal(str(existing_average_cost))
    purchase_quantity_decimal = Decimal(str(purchase_quantity))
    purchase_unit_cost_decimal = Decimal(str(purchase_unit_cost))

    total_stock = existing_stock_decimal + purchase_quantity_decimal
    if total_stock <= 0:
        return Decimal("0")

    total_cost = (existing_stock_decimal * existing_average) + (
        purchase_quantity_decimal * purchase_unit_cost_decimal
    )
    return total_cost / total_stock


def build_purchase_receipt(
    supplier: SupplierRecord | dict[str, Any],
    lines: list[dict[str, Any]],
    *,
    invoice_number: str | None = None,
    purchase_date: str,
    notes: str | None = None,
) -> PurchaseReceipt:
    supplier_record = (
        validate_supplier_record(supplier) if isinstance(supplier, dict) else supplier
    )
    if supplier_record.status != "ACTIVE":
        raise ValueError("supplier must be ACTIVE to receive purchases")

    parsed_lines: list[PurchaseLine] = []
    for line in lines:
        raw_material = _normalize_text(line.get("raw_material"))
        unit = _normalize_text(line.get("unit"))
        if not raw_material:
            raise ValueError("purchase line raw_material is required")
        if not unit:
            raise ValueError("purchase line unit is required")
        quantity = float(line.get("quantity") or 0)
        if quantity <= 0:
            raise ValueError("purchase line quantity must be greater than zero")
        unit_cost = Decimal(str(line.get("unit_cost") or 0))
        parsed_lines.append(
            PurchaseLine(
                raw_material=raw_material,
                quantity=quantity,
                unit_cost=unit_cost,
                unit=unit,
            )
        )

    return PurchaseReceipt(
        supplier=supplier_record.name,
        invoice_number=_normalize_text(invoice_number),
        purchase_date=purchase_date,
        lines=parsed_lines,
        notes=_normalize_text(notes),
    )
