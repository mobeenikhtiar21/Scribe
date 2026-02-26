/**
 * Creates test orders on the BigCommerce store for development testing.
 * Uses V2 Orders API with inline product data (no catalog scope needed).
 *
 * Usage: npx ts-node src/dev/create-test-orders.ts
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

  // V2 Orders API accepts inline product definitions (name + quantity + price_inc_tax)
  // No catalog products needed.
  const testOrders = [
    {
      status_id: 1, // Pending
      billing_address: {
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@example.com',
        street_1: '123 Main St',
        city: 'Austin',
        state: 'Texas',
        zip: '73301',
        country: 'United States',
        country_iso2: 'US',
        phone: '555-0101',
      },
      shipping_addresses: [{
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@example.com',
        street_1: '123 Main St',
        city: 'Austin',
        state: 'Texas',
        zip: '73301',
        country: 'United States',
        country_iso2: 'US',
        phone: '555-0101',
      }],
      products: [
        { name: 'Wireless Keyboard', quantity: 1, price_inc_tax: 79.99, price_ex_tax: 79.99, sku: 'KB-001' },
        { name: 'USB-C Hub Adapter', quantity: 2, price_inc_tax: 49.99, price_ex_tax: 49.99, sku: 'HUB-002' },
      ],
    },
    {
      status_id: 7, // Awaiting Payment
      billing_address: {
        first_name: 'Marcus',
        last_name: 'Chen',
        email: 'marcus.chen@example.com',
        street_1: '456 Oak Avenue',
        city: 'San Francisco',
        state: 'California',
        zip: '94102',
        country: 'United States',
        country_iso2: 'US',
        phone: '555-0202',
      },
      shipping_addresses: [{
        first_name: 'Marcus',
        last_name: 'Chen',
        email: 'marcus.chen@example.com',
        street_1: '456 Oak Avenue',
        city: 'San Francisco',
        state: 'California',
        zip: '94102',
        country: 'United States',
        country_iso2: 'US',
        phone: '555-0202',
      }],
      products: [
        { name: 'Laptop Stand', quantity: 1, price_inc_tax: 34.99, price_ex_tax: 34.99, sku: 'STD-003' },
        { name: 'Wireless Mouse', quantity: 1, price_inc_tax: 29.99, price_ex_tax: 29.99, sku: 'MS-004' },
        { name: 'Monitor Light Bar', quantity: 1, price_inc_tax: 59.99, price_ex_tax: 59.99, sku: 'MLB-005' },
      ],
    },
    {
      status_id: 2, // Shipped
      billing_address: {
        first_name: 'Emily',
        last_name: 'Brooks',
        email: 'emily.brooks@example.com',
        street_1: '789 Pine Road',
        city: 'New York',
        state: 'New York',
        zip: '10001',
        country: 'United States',
        country_iso2: 'US',
        phone: '555-0303',
      },
      shipping_addresses: [{
        first_name: 'Emily',
        last_name: 'Brooks',
        email: 'emily.brooks@example.com',
        street_1: '789 Pine Road',
        city: 'New York',
        state: 'New York',
        zip: '10001',
        country: 'United States',
        country_iso2: 'US',
        phone: '555-0303',
      }],
      products: [
        { name: 'Mechanical Keyboard', quantity: 1, price_inc_tax: 149.99, price_ex_tax: 149.99, sku: 'MKB-006' },
        { name: 'Desk Mat XL', quantity: 1, price_inc_tax: 24.99, price_ex_tax: 24.99, sku: 'DM-007' },
      ],
    },
  ];

  console.log('Creating test orders...');
  for (const orderData of testOrders) {
    try {
      const order = await bcFetch('/v2/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      console.log(`  Order #${order.id} — ${order.status} — $${order.total_inc_tax} — ${orderData.billing_address.first_name} ${orderData.billing_address.last_name}`);
    } catch (err) {
      console.error(`  Failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('');
  console.log('Done! Go to Orders in BigCommerce admin and click "Scribe Actions" on any order.');

  db.close();
}

main().catch(console.error);
