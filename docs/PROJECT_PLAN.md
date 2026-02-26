# Scribe - Project Plan

## Phase 1: Project Setup

**Goal**: Repo structure, tooling, and dev environment ready.

- [x] Initialize monorepo with `/server` and `/client` folders
- [x] Set up TypeScript config for both server and client
- [x] Express server with basic health check route
- [x] Vite + React scaffold with BigDesign installed
- [x] ESLint + Prettier configuration
- [x] Environment variables setup (`.env.example`)
- [x] SQLite database initialization script (creates tables on startup)
- [x] `npm run dev` starts both server (nodemon) and client (Vite) concurrently

**Deliverable**: `npm run dev` boots the app, hitting `localhost:3000/api/health` returns OK, and `localhost:5173` shows a blank React page with BigDesign styles.

---

## Phase 2: Auth & Installation

**Goal**: App installs on a BigCommerce store and stores credentials.

- [x] OAuth install endpoint (`GET /auth/install`)
  - Exchange auth code for access token
  - Save store_hash + access_token to SQLite
  - Register App Extensions via BigCommerce API
- [x] OAuth load endpoint (`GET /auth/load`) - validates signed payload
- [x] OAuth uninstall endpoint (`GET /auth/uninstall`) - cleans up store data
- [x] Middleware to extract and verify store context on every API request
- [x] Register app in BigCommerce Developer Portal (dev store)
- [x] Test: Install app on dev store, confirm "Scribe Actions" appears in order menu

**Deliverable**: App installs on a dev store. Clicking "Scribe Actions" on any order opens the side panel with the React app loaded.

---

## Phase 3: Side Panel UI

**Goal**: The side panel renders order info and action buttons.

- [x] Side panel entry point reads `order_id` from URL params
- [x] Fetch order details from `/api/order/:id` and display summary (order number, customer, total, status)
- [x] Action button bar: Print, Send, Message, Notes, Edit
- [x] Each button opens its respective action view within the panel
- [x] Loading states and error handling
- [x] BigDesign styling to match BigCommerce admin look and feel

**Deliverable**: Side panel opens, shows order details, and has clickable action buttons that switch between views.

---

## Phase 3b: Draft Orders App Page

**Goal**: Provide access to Scribe actions for draft orders, since App Extensions only support the `ORDERS` model (no `DRAFT_ORDERS` model exists).

**Discovery**: During implementation, we found that BigCommerce App Extensions only support the `ORDERS` model. The "Scribe Actions" button appears in the "..." menu on regular orders, but **not** on draft orders. There is no way to inject a menu item into the draft orders action menu via App Extensions.

**Solution**: A standalone app page (Apps → Scribe) that lists draft orders and lets users click into the same actions panel.

- [x] Add `GET /api/order` list endpoint with `status_id`, `page`, `limit` query params
- [x] Add `listOrders()` method to BigCommerce client service
- [x] Add `listOrders()` to frontend API client
- [x] Create `DraftOrdersList.tsx` component — table of draft orders (status_id=0) with pagination
- [x] Update `App.tsx` to support dual mode:
  - No `order_id` param → show `DraftOrdersList`
  - With `order_id` param → show order detail + actions panel (existing behavior)
- [x] Add "← Back to Draft Orders" button when navigating from the list to an order
- [x] Update `/auth/load` to redirect to `/panel?context=...` (no order_id) for normal app loads
- [x] Add dev test scripts in `server/src/dev/` for creating draft orders and testing the API

**Deliverable**: Users open Apps → Scribe, see a list of draft orders, click any row to open Print/Send/Message/Notes actions. Regular orders continue to work via the side panel "..." menu.

---

## Phase 4: Core Actions

**Goal**: All 5 actions work end-to-end.

### Print
- [x] PDF generation with PDFKit (order details, line items, totals)
- [x] Branded template (logo, store info, order number)
- [x] `POST /api/order/:id/print` returns PDF as download
- [x] Frontend triggers download when Print is clicked

### Send
- [x] Email template for sending draft order to customer
- [x] Include link for customer to complete purchase
- [x] `POST /api/order/:id/send` sends email via Nodemailer + SendGrid
- [x] Success/error feedback in the panel

### Message
- [x] Simple message compose form (to, subject, body)
- [x] Pre-filled with customer email and order reference
- [x] `POST /api/order/:id/message` sends email
- [x] Success/error feedback in the panel

### Notes
- [x] Notes list view (shows all notes for the order, newest first)
- [x] Add note form (text input + submit)
- [x] `GET /api/order/:id/notes` and `POST /api/order/:id/notes`
- [x] Notes stored in SQLite, scoped to store_hash + order_id
- [x] Author tracked per note

### Edit
- [x] Redirect to BigCommerce's native draft order editor URL
- [x] Simple link/button, no custom logic needed

**Deliverable**: All actions work. Can print a PDF, send an email, message a customer, add/view notes, and jump to edit.

---

## Phase 5: Testing & Polish

**Goal**: Reliable, polished experience.

- [x] Unit tests for API routes (Vitest)
- [x] Unit tests for PDF generation
- [x] Test email sending with SendGrid sandbox mode
- [x] Test with both draft orders and regular orders
- [x] Error handling for edge cases (missing customer email, empty orders)
- [x] Audit log entries for every action
- [x] Loading spinners, success toasts, error messages throughout the UI

**Deliverable**: Tests pass. App handles edge cases gracefully. Audit log records every action.

---

## Phase 6: Deployment

**Goal**: App running in production, accessible from any BigCommerce store.

- [ ] Provision a VPS or cloud instance (e.g., DigitalOcean, Railway, Render)
- [ ] Set up nginx/Caddy as reverse proxy with HTTPS (Let's Encrypt)
- [ ] Build React frontend (`npm run build` in client)
- [ ] Express serves the built frontend as static files
- [ ] SQLite database file in a persistent `/data` directory
- [ ] Environment variables configured for production (SendGrid key, BigCommerce credentials, app URL)
- [ ] Update BigCommerce app settings with production URL
- [ ] Smoke test: install on dev store from production URL, run through all actions

**Deliverable**: App is live. Installs from the BigCommerce marketplace (or direct install link). All actions work in production.

---

## Phase Summary

| Phase | What | Key Outcome |
|-------|------|-------------|
| 1 | Setup | Dev environment running |
| 2 | Auth | App installs on BigCommerce, side panel opens |
| 3 | UI | Side panel shows order info and action buttons |
| 3b | Draft Orders App Page | App page lists draft orders, click to open actions (App Extensions limitation workaround) |
| 4 | Actions | Print, Send, Message, Notes, Edit all work |
| 5 | Testing | Tests pass, edge cases handled, audit logging |
| 6 | Deploy | Live in production |
