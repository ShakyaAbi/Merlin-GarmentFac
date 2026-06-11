from garment_factory.garment_factory.catalog import (
    ITEM_GROUPS,
    ROLES,
    WAREHOUSES,
)


fixtures = [
    {
        "dt": "Role",
        "filters": [["role_name", "in", list(ROLES)]],
    },
    {
        "dt": "Item Group",
        "filters": [["item_group_name", "in", list(ITEM_GROUPS)]],
    },
    {
        "dt": "Warehouse",
        "filters": [["warehouse_name", "in", list(WAREHOUSES)]],
    },
]

scheduler_events = {
    "hourly": [
        "garment_factory.garment_factory.scheduler.run_low_stock_check",
    ],
}

doc_events = {
    "Work Order": {
        "on_submit": "garment_factory.garment_factory.workflow_helpers.on_work_order_submit",
    }
}
