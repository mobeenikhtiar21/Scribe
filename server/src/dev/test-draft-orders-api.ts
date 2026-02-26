/**
 * Test whether BigCommerce V2 Orders API returns draft orders.
 * Draft orders in BC admin may correspond to status_id=0 (Incomplete).
 *
 * Usage: npx ts-node src/dev/test-draft-orders-api.ts
 */
import 'dotenv/config';
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../../../data/stores.db'));
const store = db.prepare('SELECT store_hash, access_token FROM stores LIMIT 1').get() as {
  store_hash: string;
  access_token: string;
} | undefined;

if (!store) {
  console.error('No store found in database. Install the app first.');
  process.exit(1);
}

const { store_hash, access_token } = store;
const BASE = `https://api.bigcommerce.com/stores/${store_hash}`;

async function bcFetch(apiPath: string) {
  const res = await fetch(`${BASE}${apiPath}`, {
    headers: {
      'X-Auth-Token': access_token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${apiPath}: ${body}`);
  }
  return JSON.parse(body);
}

function printOrders(label: string, orders: Record<string, unknown>[]) {
  console.log(`\n=== ${label} (${orders.length} results) ===`);
  if (orders.length === 0) {
    console.log('  (none)');
    return;
  }
  for (const o of orders) {
    console.log(
      `  #${o.id} | status="${o.status}" (${o.status_id}) | ` +
      `total=${o.total_inc_tax} ${o.currency_code} | ` +
      `date=${o.date_created}`
    );
  }
}

async function main() {
  console.log(`Store: ${store_hash}`);

  // 1. Incomplete orders (status_id=0) — this is where draft orders should be
  try {
    const incomplete = await bcFetch('/v2/orders?status_id=0&limit=50');
    printOrders('Incomplete Orders (status_id=0)', Array.isArray(incomplete) ? incomplete : []);
  } catch (err) {
    console.log('\n=== Incomplete Orders (status_id=0) ===');
    console.log('  ERROR:', err instanceof Error ? err.message : err);
  }

  // 2. All orders (no filter)
  try {
    const all = await bcFetch('/v2/orders?limit=50');
    printOrders('All Orders (no filter)', Array.isArray(all) ? all : []);
  } catch (err) {
    console.log('\n=== All Orders (no filter) ===');
    console.log('  ERROR:', err instanceof Error ? err.message : err);
  }

  // 3. Recent orders sorted by date
  try {
    const recent = await bcFetch('/v2/orders?sort=date_created:desc&limit=10');
    printOrders('Recent Orders (sorted by date desc, limit 10)', Array.isArray(recent) ? recent : []);
  } catch (err) {
    console.log('\n=== Recent Orders (sorted desc) ===');
    console.log('  ERROR:', err instanceof Error ? err.message : err);
  }

  console.log('\n--- Done ---');
  console.log('Look for the Rs49.00 PKR draft order from Feb 24.');
  console.log('If it appears in status_id=0 results, draft orders ARE accessible via REST API.');

  db.close();
}

main().catch(console.error);
