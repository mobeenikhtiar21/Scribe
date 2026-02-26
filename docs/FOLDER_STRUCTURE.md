# Scribe - Folder Structure

```
scribe/
├── server/                     # Express backend
│   ├── src/
│   │   ├── index.ts            # Entry point - starts Express, serves static files
│   │   ├── routes/
│   │   │   ├── auth.ts         # /auth/install, /auth/load, /auth/uninstall
│   │   │   ├── orders.ts       # /api/order (list) + /api/order/:id (detail) — proxy to BigCommerce
│   │   │   ├── print.ts        # /api/order/:id/print (PDF generation)
│   │   │   ├── send.ts         # /api/order/:id/send (email to customer)
│   │   │   ├── message.ts      # /api/order/:id/message (direct message)
│   │   │   └── notes.ts        # /api/order/:id/notes (CRUD)
│   │   ├── middleware/
│   │   │   └── storeContext.ts  # Extracts & verifies store_hash on every request
│   │   ├── services/
│   │   │   ├── bigcommerce.ts   # BigCommerce API client wrapper
│   │   │   ├── pdf.ts           # PDFKit PDF generation
│   │   │   └── email.ts         # Nodemailer + SendGrid email sending
│   │   └── db/
│   │       ├── index.ts         # SQLite connection (better-sqlite3)
│   │       └── schema.sql       # CREATE TABLE statements, run on startup
│   │   └── dev/
│   │       ├── seed.ts                # Seed database with test data
│   │       ├── create-test-orders.ts  # Create test orders via BigCommerce API
│   │       ├── create-draft-orders.ts # Create draft orders via BigCommerce API
│   │       ├── create-catalog-products.ts # Create test catalog products
│   │       ├── register-extension.ts  # Manually register App Extension
│   │       └── test-draft-orders-api.ts # Test draft orders API endpoint
│   ├── package.json
│   └── tsconfig.json
│
├── client/                     # React frontend (side panel)
│   ├── src/
│   │   ├── main.tsx            # React entry point
│   │   ├── App.tsx             # Main app — draft orders list or order detail panel
│   │   ├── components/
│   │   │   ├── DraftOrdersList.tsx # Draft orders table with pagination (app page mode)
│   │   │   ├── OrderSummary.tsx # Order number, customer, total, status
│   │   │   ├── ActionBar.tsx   # Print | Send | Message | Notes | Edit buttons
│   │   │   ├── PrintAction.tsx # Print PDF view
│   │   │   ├── SendAction.tsx  # Send to customer view
│   │   │   ├── MessageAction.tsx # Message compose view
│   │   │   └── NotesAction.tsx # Notes list + add note view
│   │   ├── api/
│   │   │   └── client.ts       # Fetch wrapper for /api/* calls (listOrders, getOrder, etc.)
│   │   └── types/
│   │       └── index.ts        # Shared TypeScript types
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── data/                       # SQLite database files (gitignored)
│   └── stores.db
│
├── .env.example                # Template for environment variables
├── .gitignore
└── README.md
```

## Key Points

**Two `package.json` files** - server and client are independent. No workspace hoisting complexity. Each folder manages its own dependencies.

**`server/src/index.ts` serves everything** - In production, Express serves the built React files from `client/dist/` as static files. One process, one port.

**`data/` is gitignored** - The SQLite database file is created on first run. Never committed to git.

**No shared packages folder** - Types that need sharing between client and server are duplicated (it's a small app, duplication is simpler than a shared package).

## Dev Commands

```bash
# Start server with auto-reload
cd server && npm run dev

# Start React dev server (proxies API to Express)
cd client && npm run dev

# Build for production
cd client && npm run build

# Start production server (serves API + built frontend)
cd server && npm start
```

## Environment Variables (`.env.example`)

```
# BigCommerce App Credentials
BC_CLIENT_ID=
BC_CLIENT_SECRET=
BC_APP_URL=http://localhost:3000

# SendGrid
SENDGRID_API_KEY=

# App
PORT=3000
NODE_ENV=development
```
