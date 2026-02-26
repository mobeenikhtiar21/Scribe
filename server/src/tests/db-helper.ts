import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const SCHEMA_PATH = path.join(__dirname, '../db/schema.sql');
const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');

/**
 * Create an in-memory SQLite database initialized with the schema.
 */
export function createTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  return db;
}

/**
 * Seed a baseline store record into the test database.
 */
export function seedStore(
  db: Database.Database,
  storeHash = 'test-store',
  accessToken = 'test-token'
): void {
  db.prepare(
    'INSERT OR IGNORE INTO stores (store_hash, access_token) VALUES (?, ?)'
  ).run(storeHash, accessToken);
}
