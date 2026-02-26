/**
 * Manually register the Scribe App Extension via GraphQL.
 * Usage: npx ts-node src/dev/register-extension.ts
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
const GRAPHQL_URL = `https://api.bigcommerce.com/stores/${store_hash}/graphql`;

async function graphql(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'X-Auth-Token': access_token,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const body = await res.text();
  console.log(`GraphQL ${res.status}:`, body);
  return JSON.parse(body);
}

async function main() {
  console.log(`Store: ${store_hash}`);
  console.log('');

  // Step 1: List existing extensions
  console.log('=== Listing existing App Extensions ===');
  const listResult = await graphql(`
    query {
      store {
        appExtensions {
          edges {
            node {
              id
              context
              model
              url
              label {
                defaultValue
              }
            }
          }
        }
      }
    }
  `);
  console.log('');

  // Step 2: Register a new one
  console.log('=== Registering Scribe Actions extension ===');
  const createResult = await graphql(`
    mutation CreateAppExtension($input: CreateAppExtensionInput!) {
      appExtension {
        createAppExtension(input: $input) {
          appExtension {
            id
            context
            model
            url
            label {
              defaultValue
            }
          }
        }
      }
    }
  `, {
    input: {
      context: 'PANEL',
      model: 'ORDERS',
      url: '/orders/${id}/scribe',
      label: {
        defaultValue: 'Scribe Actions',
        locales: [{
          value: 'Scribe Actions',
          localeCode: 'en-US',
        }],
      },
    },
  });
  console.log('');

  db.close();
}

main().catch(console.error);
