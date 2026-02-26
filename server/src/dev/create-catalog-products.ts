/**
 * Creates catalog products so BigCommerce draft order form can load.
 * The draft order UI requires at least one product in the catalog.
 *
 * Usage: npx ts-node src/dev/create-catalog-products.ts
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

async function bcFetch(apiPath: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${apiPath}`, {
    headers: {
      'X-Auth-Token': access_token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  const body = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${apiPath}: ${body}`);
  }
  return JSON.parse(body);
}

async function main() {
  console.log(`Store: ${store_hash}`);
  console.log('');

  const products = [
    {
      name: 'Premium Wireless Headphones',
      type: 'physical',
      weight: 0.5,
      price: 199.99,
      sku: 'PH-100',
      description: 'High-quality wireless headphones with noise cancellation.',
    },
    {
      name: 'Ergonomic Office Chair',
      type: 'physical',
      weight: 25,
      price: 599.99,
      sku: 'ECP-300',
      description: 'Premium ergonomic chair with lumbar support.',
    },
    {
      name: 'Standing Desk Frame',
      type: 'physical',
      weight: 30,
      price: 349.99,
      sku: 'SDF-200',
      description: 'Electric standing desk frame, adjustable height.',
    },
    {
      name: 'Mechanical Keyboard',
      type: 'physical',
      weight: 1,
      price: 149.99,
      sku: 'MKB-006',
      description: 'Mechanical keyboard with Cherry MX switches.',
    },
    {
      name: 'USB-C Hub Adapter',
      type: 'physical',
      weight: 0.2,
      price: 49.99,
      sku: 'HUB-002',
      description: '7-in-1 USB-C hub with HDMI, USB 3.0, and SD card reader.',
    },
  ];

  console.log('Creating catalog products...');
  for (const product of products) {
    try {
      const result = await bcFetch('/v3/catalog/products', {
        method: 'POST',
        body: JSON.stringify(product),
      });
      console.log(`  Created: ${result.data.name} (ID: ${result.data.id}) — $${result.data.price}`);
    } catch (err) {
      console.error(`  Failed (${product.name}):`, err instanceof Error ? err.message : err);
    }
  }

  console.log('');
  console.log('Done! You should now be able to create draft orders in BigCommerce admin.');

  db.close();
}

main().catch(console.error);
