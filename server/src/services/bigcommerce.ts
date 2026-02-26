const BC_API_BASE = 'https://api.bigcommerce.com/stores';

interface BigCommerceClientOptions {
  storeHash: string;
  accessToken: string;
}

interface GraphQLResponse<T = unknown> {
  data?: T;
  errors?: { message: string }[];
}

/**
 * Lightweight BigCommerce API client.
 * Wraps fetch calls to the BigCommerce V2/V3 REST and GraphQL Admin APIs.
 */
export class BigCommerceClient {
  private storeHash: string;
  private accessToken: string;

  constructor({ storeHash, accessToken }: BigCommerceClientOptions) {
    this.storeHash = storeHash;
    this.accessToken = accessToken;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${BC_API_BASE}/${this.storeHash}${path}`;
    const res = await fetch(url, {
      headers: {
        'X-Auth-Token': this.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`BigCommerce API error ${res.status}: ${body}`);
    }

    return res.json() as T;
  }

  /** Execute a GraphQL query/mutation against the Admin API */
  private async graphql<T = unknown>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const url = `${BC_API_BASE}/${this.storeHash}/graphql`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'X-Auth-Token': this.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`BigCommerce GraphQL error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as GraphQLResponse<T>;

    if (json.errors && json.errors.length > 0) {
      throw new Error(
        `BigCommerce GraphQL errors: ${json.errors.map((e) => e.message).join(', ')}`
      );
    }

    return json.data as T;
  }

  // ── REST API (V2/V3) ──────────────────────────────────────────────

  /** Get a single order by ID (V2 API) */
  async getOrder(orderId: number) {
    return this.request<Record<string, unknown>>(`/v2/orders/${orderId}`);
  }

  /** Get order products (V2 API) */
  async getOrderProducts(orderId: number) {
    return this.request<Record<string, unknown>[]>(`/v2/orders/${orderId}/products`);
  }

  /** Get shipping addresses for an order (V2 API) */
  async getOrderShippingAddresses(orderId: number) {
    return this.request<Record<string, unknown>[]>(`/v2/orders/${orderId}/shipping_addresses`);
  }

  /** Get store information */
  async getStoreInfo() {
    return this.request<Record<string, unknown>>('/v2/store');
  }

  /** List orders with optional filters (V2 API) */
  async listOrders(params?: { status_id?: number; limit?: number; page?: number }) {
    const query = new URLSearchParams();
    if (params?.status_id !== undefined) query.set('status_id', String(params.status_id));
    query.set('limit', String(params?.limit || 50));
    query.set('page', String(params?.page || 1));
    query.set('sort', 'date_created:desc');
    const qs = query.toString();
    return this.request<Record<string, unknown>[]>(`/v2/orders?${qs}`);
  }

  // ── GraphQL: App Extensions ────────────────────────────────────────

  /**
   * Register an App Extension (side panel for orders).
   * Uses the GraphQL Admin API — this is the only way to manage App Extensions.
   */
  async registerAppExtension(label: string, url: string): Promise<{ id: string }> {
    const mutation = `
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
    `;

    const variables = {
      input: {
        context: 'PANEL',
        model: 'ORDERS',
        url,
        label: {
          defaultValue: label,
          locales: [
            {
              value: label,
              localeCode: 'en-US',
            },
          ],
        },
      },
    };

    interface CreateResult {
      appExtension: {
        createAppExtension: {
          appExtension: {
            id: string;
            context: string;
            model: string;
            url: string;
          };
        };
      };
    }

    const data = await this.graphql<CreateResult>(mutation, variables);
    const ext = data.appExtension.createAppExtension.appExtension;
    console.log(`App Extension registered: ${ext.id} (${ext.model} ${ext.context})`);
    return { id: ext.id };
  }

  /**
   * List all App Extensions for this app on this store.
   */
  async listAppExtensions(): Promise<{ id: string; model: string; url: string }[]> {
    const query = `
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
    `;

    interface ListResult {
      store: {
        appExtensions: {
          edges: {
            node: {
              id: string;
              model: string;
              url: string;
            };
          }[];
        };
      };
    }

    const data = await this.graphql<ListResult>(query);
    return data.store.appExtensions.edges.map((e) => e.node);
  }

  /**
   * Delete an App Extension by ID.
   */
  async deleteAppExtension(extensionId: string): Promise<void> {
    const mutation = `
      mutation DeleteAppExtension($input: DeleteAppExtensionInput!) {
        appExtension {
          deleteAppExtension(input: $input) {
            deletedAppExtensionId
          }
        }
      }
    `;

    await this.graphql(mutation, {
      input: { appExtensionId: extensionId },
    });
  }
}
