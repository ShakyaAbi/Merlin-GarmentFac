"""Validation rules for supplier management."""

from __future__ import annotations

from ...inventory_domain import validate_supplier_record


def validate_supplier(payload: dict[str, object]) -> dict[str, object]:
    """Validate supplier input and return a normalized payload."""

    record = validate_supplier_record(payload)
    return {
        "name": record.name,
        "phone": record.phone,
        "contact_name": record.contact_name,
        "email": record.email,
        "address": record.address,
        "pan_vat_number": record.pan_vat_number,
        "notes": record.notes,
        "status": record.status,
    }

