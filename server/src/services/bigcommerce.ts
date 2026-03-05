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

  // ── Cart API (V3) ────────────────────────────────────────────────

  /** Create a cart with line items, optionally for a specific customer */
  async createCart(lineItems: { product_id: number; quantity: number }[], customerId?: number) {
    const body: Record<string, unknown> = { line_items: lineItems };
    if (customerId) body.customer_id = customerId;
    return this.request<{ data: Record<string, unknown> }>(
      '/v3/carts?include=redirect_urls',
      { method: 'POST', body: JSON.stringify(body) }
    );
  }

  /** Get an existing cart by ID */
  async getCart(cartId: string) {
    return this.request<{ data: Record<string, unknown> }>(
      `/v3/carts/${cartId}?include=redirect_urls`
    );
  }

  /** Delete a cart by ID */
  async deleteCart(cartId: string) {
    const url = `${BC_API_BASE}/${this.storeHash}/v3/carts/${cartId}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Auth-Token': this.accessToken,
        Accept: 'application/json',
      },
    });
    if (!res.ok && res.status !== 204) {
      const body = await res.text();
      throw new Error(`BigCommerce API error ${res.status}: ${body}`);
    }
  }

  // ── Catalog & Customers (V3) ────────────────────────────────────────

  /** Search/list products from the catalog */
  async getProducts(params?: { keyword?: string; limit?: number; page?: number }) {
    const query = new URLSearchParams();
    if (params?.keyword) query.set('keyword', params.keyword);
    query.set('limit', String(params?.limit || 20));
    query.set('page', String(params?.page || 1));
    query.set('include', 'images');
    const qs = query.toString();
    return this.request<{ data: Record<string, unknown>[] }>(`/v3/catalog/products?${qs}`);
  }

  /** Search/list customers */
  async getCustomers(params?: { 'name:like'?: string; 'email:like'?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.['name:like']) query.set('name:like', params['name:like']);
    if (params?.['email:like']) query.set('email:like', params['email:like']);
    query.set('limit', String(params?.limit || 20));
    const qs = query.toString();
    return this.request<{ data: Record<string, unknown>[] }>(`/v3/customers?${qs}`);
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
