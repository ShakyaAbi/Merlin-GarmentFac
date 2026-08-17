# Article CRUD Design

## Goal

Make the article catalog fully usable for create, edit, and archive-delete operations while preserving historical sales and production references.

## Existing flow

- Create: `CreateArticlePage` sends `POST /inventory/finished-goods`.
- Edit: `FinishedGoodDetailPage` opens from `?edit=1` and sends `PUT /inventory/finished-goods/:id`.
- Delete: `FinishedGoodsPage` confirms archive and sends `DELETE /inventory/finished-goods/:id`.
- Backend already stores `deletedAt`, sets `active=false` on delete, excludes deleted rows by default, and allows admins to list deleted rows.

## Design

Reuse the existing editor and API layers. Fix the article list's delete call so it uses the shared API client, then reload the list after a successful archive. Keep the existing detail-page edit form, BOM normalization, image upload, validation, and role checks. Archived articles remain available to historical records and are visible only in the admin “Show deleted articles” view.

No restore workflow or separate edit page is included.

## Error handling and permissions

- Create and edit retain existing validation and display errors.
- Delete keeps the confirmation prompt and reports API failures in the list page.
- Only admin users can archive articles; managers can edit but not delete.
- Archived articles cannot be edited from the list.

## Verification

Add or update focused source checks for the list delete client call, edit navigation/save path, admin-only archive route, and deleted-list filtering. Run the focused web/API tests and the web build.
