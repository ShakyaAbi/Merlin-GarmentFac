# Merlin Lite Technical Stack Overview

This document describes the main technologies used in the Merlin Lite system, excluding the ML service.

## 1. System Architecture

Merlin Lite uses a layered full-stack architecture:

- `frontend` handles the user interface and browser-side interactions.
- `backend` exposes application APIs and business logic.
- `database` stores persistent application data.
- `ML service` exists as a separate component, but it is intentionally excluded from this document.

The application is split into independently runnable services during development, which makes it easier to start, debug, and test each layer on its own.

## 2. Frontend

The frontend is built with:

- `React 19`
- `TypeScript`
- `Vite` for local development and bundling

### Frontend responsibilities

- Render the user interface.
- Manage navigation and page-level state.
- Call backend APIs for application data.
- Present forms, tables, dialogs, and inventory workflows.

### Frontend implementation style

- Component-based UI structure.
- Strong typing through TypeScript.
- Fast local feedback through Vite hot reloading.

## 3. Backend

The backend is built with:

- `Node.js`
- `Express`

### Backend responsibilities

- Define HTTP API endpoints.
- Validate request and response data.
- Apply business rules.
- Coordinate persistence and domain logic.

### Backend design

- API-first service structure.
- Modular organization by feature or domain area.
- Strong separation between request handling and application logic.
- Express middleware is used for cross-cutting concerns such as authentication, request parsing, and error handling.

## 4. Database And Data Access

The system uses a relational database for persistent storage.

Typical responsibilities of the database layer include:

- User and account records.
- Inventory and transaction data.
- Purchase and operational records.
- Other application entities required by the business workflow.

The backend talks to the database through a structured data access layer so that business rules stay separate from raw queries.

## 5. Development Tooling

The project uses standard modern development tooling:

- `npm` / package scripts for running the frontend and related tasks.
- Local service startup scripts for the backend and UI.
- Environment-based configuration for separating development and runtime settings.

For local development, the services are typically run independently so each part can be verified in isolation.

## 6. API Communication

The frontend and backend communicate over HTTP.

Common patterns include:

- REST-style endpoints.
- JSON request and response payloads.
- Async client-side requests from the UI to the backend.

## 7. Quality And Maintainability

The codebase is organized to support:

- Clear separation of concerns.
- Reusable UI and backend logic.
- Easier testing and debugging.
- Maintainable feature growth over time.

## 8. What Is Not Included Here

This document does not cover the ML service, model training flow, or ML-specific runtime dependencies.

## 9. Short Summary

Merlin Lite is a React 19 and TypeScript frontend paired with a Node.js and Express backend, backed by a relational database and standard modern development tooling. The architecture is modular, service-oriented, and designed for local development and incremental feature work.
