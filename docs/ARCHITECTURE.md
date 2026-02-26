# Scribe - Architecture

## Overview

Scribe is a BigCommerce app that adds missing actions (Print, Send, Message, Notes) to orders. It has two entry points:

- **App page** (Apps → Scribe) — lists draft orders, click to open actions panel
- **Side panel** ("..." menu on regular orders) — opens actions panel directly via App Extension

**Architecture: 3 layers, 1 process.**

```
BigCommerce Admin
    │
    ├── Apps → Scribe (app page)         ├── "..." → Scribe Actions (side panel)
    │   Draft orders list → click row    │   Opens directly with order context
    │                                    │
    ▼                                    ▼
┌─────────────────────────────────────────────┐
│  React Frontend (iframe)                    │
│  - Loaded inside BigCommerce admin          │
│  - Uses BigDesign components                │
│  - Draft orders list (app page mode)        │
│  - Order actions panel (both modes)         │
│  - Shows Print, Send, Message, Notes, Edit  │
└──────────────────┬──────────────────────────┘
                   │ HTTP requests
                   ▼
┌─────────────────────────────────────────────┐
│  Express Server (single process)            │
│  - Serves React build (static files)        │
│  - API routes (/api/*)                      │
│  - BigCommerce OAuth install handler        │
│  - PDF generation (PDFKit)                  │
│  - Email sending (Nodemailer + SendGrid)    │
└──────────┬─────────────────┬────────────────┘
           │                 │
           ▼                 ▼
┌──────────────────┐  ┌──────────────────────┐
│  SQLite Database  │  │  BigCommerce API     │
│  - stores.db      │  │  - Orders            │
│  - Store tokens    │  │  - Customers         │
│  - Notes           │  │  - Store Info        │
│  - Audit log       │  │                      │
└──────────────────┘  └──────────────────────┘
```

## How BigCommerce App Extensions Work

App Extensions let us inject a menu item into the order actions dropdown. When clicked, BigCommerce opens our app in a **side panel iframe**.

**Important limitation**: App Extensions only support the `ORDERS` model. There is no `DRAFT_ORDERS` model, so the "Scribe Actions" button **cannot** appear in the draft orders "..." menu. This is why Scribe uses a standalone app page for draft orders (see [App Page Flow](#app-page-flow) below).

```
Orders Page (regular orders — App Extension works here)
┌─────────────────────────────────────────────────────┐
│  Orders                                             │
│  ┌────────────────────────────────────┐             │
│  │ Order #1050  │ $500.00 │ ••• ──┐  │             │
│  │ Order #1051  │ $300.00 │  •••  │  │             │
│  └──────────────────────────┼──────┘  │             │
│                             │ Edit          │       │
│                             │ Scribe Actions│ ◄── App Extension
│                             └───────────────┘       │
│                                                     │
│  ┌─── Side Panel (iframe) ──────────────────────┐   │
│  │                                              │   │
│  │  Scribe Actions - Order #1050                │   │
│  │                                              │   │
│  │  [Print]  [Send]  [Message]  [Notes]  [Edit] │   │
│  │                                              │   │
│  │  (action content loads here)                 │   │
│  │                                              │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

**Key detail**: When a user clicks "Scribe Actions" on an order, BigCommerce sends a `signed_payload_jwt` to our `/auth/load` callback. The JWT's `url` field contains the resolved template URL (e.g., `/orders/1042/scribe`). We verify the JWT, extract the order ID, build a session context, and redirect to the React panel with `order_id` in the URL.

## App Extensions Registration (GraphQL)

App Extensions are managed via BigCommerce's **GraphQL Admin API** (not REST):

```graphql
mutation {
  appExtension {
    createAppExtension(input: {
      context: PANEL              # Opens a side panel
      model: ORDERS               # Appears on the orders page
      url: "/orders/${id}/scribe" # ${id} is replaced with the actual order ID
      label: { defaultValue: "Scribe Actions" }
    }) {
      appExtension { id }
    }
  }
}
```

This is called once during app installation. The `ORDERS` model adds the menu item to regular orders. There is no `DRAFT_ORDERS` model, so draft orders are handled via the app page instead.

## App Installation Flow (OAuth)

BigCommerce single-click apps use a standard OAuth flow:

```
1. Store owner clicks "Install" in BigCommerce App Marketplace
          │
          ▼
2. BigCommerce sends GET /auth/install?code=XXX&scope=YYY&context=stores/ZZZ
          │
          ▼
3. Our server exchanges the code for a permanent API token
   POST https://login.bigcommerce.com/oauth2/token
          │
          ▼
4. We store the token + store hash in SQLite
   INSERT INTO stores (store_hash, access_token, ...)
          │
          ▼
5. We register App Extensions via GraphQL Admin API
   POST /stores/{hash}/graphql  (createAppExtension mutation)
          │
          ▼
6. Done. "Scribe Actions" now appears in the order action menu.
```

After installation, the store's access token is saved in SQLite. Every API call to BigCommerce uses this stored token.

## Side Panel Load Flow (Regular Orders)

When a user clicks "Scribe Actions" on a regular order via the "..." menu:

```
1. BigCommerce sends GET /auth/load?signed_payload_jwt=...
          │
          ▼
2. Our server verifies the JWT (HS256, signed with Client Secret)
   Extracts: store_hash, user, resolved url ("/orders/1042/scribe")
          │
          ▼
3. We build an encoded session context (base64url of store_hash + user info)
   and redirect to: /panel?context={encoded}&order_id=1042
          │
          ▼
4. React app loads, reads order_id and context from URL params
   Shows the order detail + actions panel directly
          │
          ▼
5. storeContext middleware decodes context, looks up the store's access token
   All API calls to BigCommerce use this token
```

## App Page Load Flow (Draft Orders)

When a user opens Apps → Scribe in the BigCommerce admin:

```
1. BigCommerce sends GET /auth/load?signed_payload_jwt=...
          │
          ▼
2. Our server verifies the JWT — same as side panel flow
   JWT's url field is "/" (normal app load, no order ID)
          │
          ▼
3. We redirect to: /panel?context={encoded}  (no order_id param)
          │
          ▼
4. React app loads, sees no order_id → renders DraftOrdersList component
   Calls GET /api/order?status_id=0 to fetch draft (Incomplete) orders
          │
          ▼
5. User clicks a row → selectedOrderId is set → order detail + actions panel loads
   A "← Back to Draft Orders" button lets the user return to the list
```

## API Routes

```
Authentication:
  GET  /auth/install      - OAuth install callback (from BigCommerce)
  GET  /auth/load         - App/Extension load callback (verifies JWT, redirects to panel)
  GET  /auth/uninstall    - Cleanup when app is uninstalled
  GET  /auth/remove-user  - Cleanup when a user is removed

Side Panel:
  GET  /panel            - Serves the React side panel (entry point for iframe)

API:
  GET  /api/order              - List orders (optional status_id, page, limit filters)
  GET  /api/order/:id          - Fetch order details (proxies BigCommerce API)
  POST /api/order/:id/print    - Generate PDF for order
  POST /api/order/:id/send     - Email order to customer
  POST /api/order/:id/message  - Send message to customer
  GET  /api/order/:id/notes    - Get internal notes for order
  POST /api/order/:id/notes    - Add internal note to order
```

## Database Schema (SQLite)

```sql
-- Installed stores and their API tokens
CREATE TABLE stores (
  id            INTEGER PRIMARY KEY,
  store_hash    TEXT UNIQUE NOT NULL,
  access_token  TEXT NOT NULL,
  store_url     TEXT,
  owner_email   TEXT,
  installed_at  TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- Internal notes on orders (stored locally, not in BigCommerce)
CREATE TABLE notes (
  id          INTEGER PRIMARY KEY,
  store_hash  TEXT NOT NULL,
  order_id    INTEGER NOT NULL,
  author      TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_hash) REFERENCES stores(store_hash)
);

-- Audit log of actions taken
CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY,
  store_hash  TEXT NOT NULL,
  order_id    INTEGER NOT NULL,
  action      TEXT NOT NULL,  -- 'print', 'send', 'message', 'note'
  actor       TEXT,
  detail      TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);
```

## Security

- **Store isolation**: Every API request is scoped to a store_hash. Stores cannot access each other's data.
- **Token storage**: BigCommerce access tokens stored in SQLite, never exposed to the frontend.
- **HTTPS only**: All communication over TLS.
- **Scoped API access**: We request only the BigCommerce OAuth scopes we need (Orders read/write, Customers read).
- **Session validation**: The side panel iframe receives a signed payload from BigCommerce that we verify on each load.

## Deployment (Simple)

```
Production server (single VPS or cloud instance)
├── Node.js process (Express)
│   ├── Serves /api/* routes
│   ├── Serves React build from /client/dist
│   └── SQLite database file (./data/stores.db)
└── Reverse proxy (nginx or Caddy)
    └── HTTPS termination + proxy to Node on port 3000
```

No containers. No orchestration. One process, one database file, one server.
