/**
 * Creates draft orders on the BigCommerce store for testing Scribe.
 * Usage: npx ts-node src/dev/create-draft-orders.ts
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

  // Also create a couple of regular orders with the real email
  const orders = [
    {
      status_id: 1, // Pending
      billing_address: {
        first_name: 'Umair',
        last_name: 'Khattak',
        email: 'umairkhattak692@gmail.com',
        street_1: '42 Commerce Blvd',
        city: 'Islamabad',
        state: 'ICT',
        zip: '44000',
        country: 'Pakistan',
        country_iso2: 'PK',
        phone: '555-1234',
      },
      shipping_addresses: [{
        first_name: 'Umair',
        last_name: 'Khattak',
        email: 'umairkhattak692@gmail.com',
        street_1: '42 Commerce Blvd',
        city: 'Islamabad',
        state: 'ICT',
        zip: '44000',
        country: 'Pakistan',
        country_iso2: 'PK',
        phone: '555-1234',
      }],
      products: [
        { name: 'Premium Headphones', quantity: 1, price_inc_tax: 199.99, price_ex_tax: 199.99, sku: 'PH-100' },
        { name: 'Headphone Case', quantity: 1, price_inc_tax: 29.99, price_ex_tax: 29.99, sku: 'HC-101' },
        { name: 'Audio Cable 3.5mm', quantity: 2, price_inc_tax: 12.99, price_ex_tax: 12.99, sku: 'AC-102' },
      ],
    },
    {
      status_id: 7, // Awaiting Payment
      billing_address: {
        first_name: 'Umair',
        last_name: 'Khattak',
        email: 'umairkhattak692@gmail.com',
        street_1: '42 Commerce Blvd',
        city: 'Islamabad',
        state: 'ICT',
        zip: '44000',
        country: 'Pakistan',
        country_iso2: 'PK',
        phone: '555-1234',
      },
      shipping_addresses: [{
        first_name: 'Umair',
        last_name: 'Khattak',
        email: 'umairkhattak692@gmail.com',
        street_1: '42 Commerce Blvd',
        city: 'Islamabad',
        state: 'ICT',
        zip: '44000',
        country: 'Pakistan',
        country_iso2: 'PK',
        phone: '555-1234',
      }],
      products: [
        { name: 'Standing Desk Frame', quantity: 1, price_inc_tax: 349.99, price_ex_tax: 349.99, sku: 'SDF-200' },
        { name: 'Bamboo Desktop 60"', quantity: 1, price_inc_tax: 179.99, price_ex_tax: 179.99, sku: 'BD-201' },
        { name: 'Cable Management Kit', quantity: 1, price_inc_tax: 24.99, price_ex_tax: 24.99, sku: 'CMK-202' },
        { name: 'Monitor Arm Dual', quantity: 1, price_inc_tax: 89.99, price_ex_tax: 89.99, sku: 'MAD-203' },
      ],
    },
    {
      status_id: 0, // Incomplete (acts like a draft)
      billing_address: {
        first_name: 'Umair',
        last_name: 'Khattak',
        email: 'umairkhattak692@gmail.com',
        street_1: '42 Commerce Blvd',
        city: 'Islamabad',
        state: 'ICT',
        zip: '44000',
        country: 'Pakistan',
        country_iso2: 'PK',
        phone: '555-1234',
      },
      shipping_addresses: [{
        first_name: 'Umair',
        last_name: 'Khattak',
        email: 'umairkhattak692@gmail.com',
        street_1: '42 Commerce Blvd',
        city: 'Islamabad',
        state: 'ICT',
        zip: '44000',
        country: 'Pakistan',
        country_iso2: 'PK',
        phone: '555-1234',
      }],
      products: [
        { name: 'Ergonomic Chair Pro', quantity: 1, price_inc_tax: 599.99, price_ex_tax: 599.99, sku: 'ECP-300' },
        { name: 'Lumbar Support Pillow', quantity: 1, price_inc_tax: 39.99, price_ex_tax: 39.99, sku: 'LSP-301' },
      ],
    },
  ];

  console.log('Creating orders with umairkhattak692@gmail.com ...');
  for (const orderData of orders) {
    try {
      const order = await bcFetch('/v2/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
      console.log(`  Order #${order.id} — ${order.status} — $${order.total_inc_tax}`);
    } catch (err) {
      console.error(`  Failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log('');
  console.log('Done! Check Orders and Draft Orders in BigCommerce admin.');

  db.close();
}

main().catch(console.error);
