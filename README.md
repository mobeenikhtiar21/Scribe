# Scribe

A BigCommerce app that extends order management with Print, Send, Message, Notes, and Edit actions. Works as both a standalone app page (draft orders list) and an order side panel (via App Extensions).

## Tech Stack

- **Backend:** Node.js + TypeScript + Express + SQLite (better-sqlite3)
- **Frontend:** React 18 + Vite + BigDesign
- **PDF:** PDFKit
- **Email:** Nodemailer + SendGrid SMTP
- **Tests:** Vitest + Supertest

## Prerequisites

- Node.js 20+
- npm
- A [BigCommerce sandbox store](https://developer.bigcommerce.com/docs/start/about/sandboxes)
- A BigCommerce app registered in the [Developer Portal](https://devtools.bigcommerce.com/)

## Project Structure

```
scribe/
├── server/                 # Express API
│   └── src/
│       ├── routes/         # auth, orders, print, send, message, notes
│       ├── services/       # BigCommerce client, PDF, email
│       ├── middleware/      # Store context (auth)
│       ├── db/             # SQLite schema & connection
│       └── dev/            # Dev helper scripts
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components (BigDesign)
│       ├── api/            # API client
│       └── types/          # TypeScript types
├── data/                   # SQLite database (gitignored)
└── docs/                   # Architecture & planning docs
```

## Setup

### 1. Environment Variables

```bash
cp .env.example .env
```

Fill in your `.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `BC_CLIENT_ID` | Yes | BigCommerce app Client ID |
| `BC_CLIENT_SECRET` | Yes | BigCommerce app Client Secret |
| `BC_APP_URL` | Yes | App URL (default: `http://localhost:4001`) |
| `SENDGRID_API_KEY` | No | SendGrid API key. Without it, emails are logged to console. |
| `EMAIL_FROM` | No | Sender email address (default: `noreply@scribe-app.com`) |
| `PORT` | No | Server port (default: `4001`) |
| `NODE_ENV` | No | `development` or `production` |

### 2. Install Dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Register BigCommerce App

In the [BigCommerce Developer Portal](https://devtools.bigcommerce.com/), configure your app callbacks:

| Callback | URL |
|----------|-----|
| Auth (Install) | `http://localhost:4001/auth/install` |
| Load | `http://localhost:4001/auth/load` |
| Uninstall | `http://localhost:4001/auth/uninstall` |
| Remove User | `http://localhost:4001/auth/remove-user` |

Required OAuth scopes:
- Orders (read-only)
- Store Information (read-only)

## Running Locally

Start both servers (in separate terminals):

```bash
# Terminal 1 — API server (port 4001)
cd server
npm run dev

# Terminal 2 — Vite dev server (port 4002)
cd client
npm run dev
```

The Vite dev server at `http://localhost:4002` proxies `/api` and `/auth` requests to the Express server.

### How to Access the App

1. Install the app on your sandbox store from the BigCommerce admin
2. **Draft orders list:** Go to Apps > Scribe in BigCommerce admin
3. **Order side panel:** Open any order, click the "..." menu, then "Scribe Actions"

## Running Tests

```bash
cd server
npm test          # Run all tests once
npm run test:watch  # Watch mode
```

## Building for Production

```bash
# Build server
cd server
npm run build

# Build client
cd client
npm run build
```

The server serves the built client from `client/dist/` in production. Start with:

```bash
cd server
NODE_ENV=production npm start
```

## Available Scripts

### Server

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload (nodemon) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production server |
| `npm test` | Run test suite |
| `npm run test:watch` | Run tests in watch mode |

### Client

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 4002) |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |

## Database

SQLite database is stored in `data/scribe.db` (auto-created on first run). Three tables:

- **stores** — Installed store credentials (store_hash, access_token)
- **notes** — Internal order notes (per-store, per-order)
- **audit_log** — Action history (print, send, message, note)

In development, a dev store is automatically seeded on startup.
