/**
 * Dev seed script — inserts a fake store into SQLite so the app works
 * locally without real BigCommerce credentials.
 *
 * Usage: npx ts-node src/dev/seed.ts
 * Or automatically called on server startup in dev mode.
 */
import { initDatabase, getDb } from '../db';

const DEV_STORE_HASH = 'dev-store-123';
const DEV_ACCESS_TOKEN = 'fake-token-for-local-dev';

export function seedDevStore(): void {
  const db = getDb();

  const existing = db
    .prepare('SELECT store_hash FROM stores WHERE store_hash = ?')
    .get(DEV_STORE_HASH);

  if (existing) return;

  db.prepare(`
    INSERT INTO stores (store_hash, access_token, owner_email, store_url)
    VALUES (?, ?, ?, ?)
  `).run(DEV_STORE_HASH, DEV_ACCESS_TOKEN, 'dev@example.com', 'http://localhost:3000');

  console.log(`Dev store seeded: ${DEV_STORE_HASH}`);
}

// Run directly
if (require.main === module) {
  initDatabase();
  seedDevStore();
  console.log('Done.');
}
