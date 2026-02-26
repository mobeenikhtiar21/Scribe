# Scribe - Technology Stack

## Runtime & Language

| Technology | Purpose | Why |
|-----------|---------|-----|
| **Node.js 20 LTS** | Server runtime | Same language front and back, huge ecosystem, BigCommerce SDK support |
| **TypeScript** | Language | Catches bugs at compile time, better IDE support, self-documenting |

## Backend

| Technology | Purpose | Why |
|-----------|---------|-----|
| **Express.js** | HTTP server & API | Simple, mature, minimal boilerplate. Serves both API routes and the built React frontend from a single process |
| **SQLite** (via `better-sqlite3`) | Database | Zero-config, single-file database. No separate DB server to run. Perfect for a small app. Can migrate to Postgres later if needed |
| **PDFKit** | PDF generation | Lightweight, no headless browser needed (vs Puppeteer). Programmatic control over layout |
| **Nodemailer** | Email sending | Standard Node.js email library. Pairs with SendGrid SMTP for delivery |
| **SendGrid** | Email delivery | Reliable transactional email. Free tier covers early usage. Simple SMTP integration with Nodemailer |

## Frontend

| Technology | Purpose | Why |
|-----------|---------|-----|
| **React 18** | Side panel UI | Component-based, widely known, good for the small interactive panel we need |
| **Vite** | Build tool | Fast dev server, fast builds, zero-config for React + TypeScript |
| **BigDesign** | UI components | BigCommerce's official React component library. Matches the admin panel look and feel exactly |

## BigCommerce Integration

| Technology | Purpose | Why |
|-----------|---------|-----|
| **BigCommerce Node SDK** | API client | Official SDK for Orders, Customers, and Store APIs |
| **App Extensions API** | Admin UI injection | Official way to add "Scribe Actions" to the order action menu and open a side panel |
| **OAuth** | App installation | Standard BigCommerce single-click app auth flow |

## Dev Tools

| Technology | Purpose |
|-----------|---------|
| **ESLint + Prettier** | Code formatting and linting |
| **Vitest** | Unit testing (fast, Vite-native) |
| **nodemon** | Auto-restart server during development |

## What We're NOT Using

| Avoided | Why |
|---------|-----|
| Docker | Unnecessary complexity for a single-process Node app |
| Microservices | One Express server handles everything. No need to split |
| Puppeteer/Playwright | PDFKit generates PDFs without a headless browser |
| PostgreSQL/MySQL | SQLite is simpler and sufficient. No separate DB process |
| Next.js/Remix | Overkill. The frontend is a small side panel, not a full website |
| Redis | No caching layer needed at this scale |
| GraphQL | REST is simpler for our straightforward API calls |
