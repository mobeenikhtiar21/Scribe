-- Installed stores and their API tokens
CREATE TABLE IF NOT EXISTS stores (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  store_hash    TEXT UNIQUE NOT NULL,
  access_token  TEXT NOT NULL,
  store_url     TEXT,
  owner_email   TEXT,
  installed_at  TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- Internal notes on orders (stored locally, not in BigCommerce)
CREATE TABLE IF NOT EXISTS notes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  store_hash  TEXT NOT NULL,
  order_id    INTEGER NOT NULL,
  author      TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (store_hash) REFERENCES stores(store_hash)
);

CREATE INDEX IF NOT EXISTS idx_notes_store_order ON notes(store_hash, order_id);

-- Audit log of actions taken
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  store_hash  TEXT NOT NULL,
  order_id    INTEGER NOT NULL,
  action      TEXT NOT NULL,
  actor       TEXT,
  detail      TEXT,
  created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_store_order ON audit_log(store_hash, order_id);
