const BASE_URL = '/api';

/**
 * Get the session context from URL params.
 * This is set by the /auth/load redirect after JWT verification.
 */
function getSessionContext(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('context');
}

/**
 * Append session context to a URL path as a query param.
 * The server's storeContext middleware reads this to identify the store.
 */
function withContext(path: string): string {
  const context = getSessionContext();
  if (!context) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}context=${encodeURIComponent(context)}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${withContext(path)}`;

  // Build headers — omit Content-Type for requests without a body
  const headers: Record<string, string> = {};
  const context = getSessionContext();
  if (context) {
    headers['x-store-context'] = context;
  }
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `Request failed: ${res.status}`);
  }

  // Handle PDF blob responses
  if (res.headers.get('content-type')?.includes('application/pdf')) {
    return res.blob() as unknown as T;
  }

  return res.json();
}

export const api = {
  listOrders(params?: { status_id?: number; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status_id !== undefined) query.set('status_id', String(params.status_id));
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<Record<string, unknown>[]>(`/order${qs ? `?${qs}` : ''}`);
  },

  getOrder(orderId: string) {
    return request<Record<string, unknown>>(`/order/${orderId}`);
  },

  printOrder(orderId: string) {
    return request<Blob>(`/order/${orderId}/print`, { method: 'POST' });
  },

  sendOrder(orderId: string) {
    return request<{ success: boolean }>(`/order/${orderId}/send`, {
      method: 'POST',
    });
  },

  messageCustomer(orderId: string, body: { subject: string; message: string }) {
    return request<{ success: boolean }>(`/order/${orderId}/message`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getNotes(orderId: string) {
    return request<{ notes: Record<string, unknown>[] }>(`/order/${orderId}/notes`);
  },

  addNote(orderId: string, body: { content: string }) {
    return request<Record<string, unknown>>(`/order/${orderId}/notes`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // ── Draft Orders ──────────────────────────────────────────

  listDrafts() {
    return request<Record<string, unknown>[]>('/drafts');
  },

  createDraft(body: { line_items: { product_id: number; quantity: number }[]; customer_id?: number; customer_email?: string; customer_name?: string }) {
    return request<Record<string, unknown>>('/drafts', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  importDraft(url: string) {
    return request<Record<string, unknown>>('/drafts/import', {
      method: 'POST',
      body: JSON.stringify({ url }),
    });
  },

  getDraft(cartId: string) {
    return request<{ cart: Record<string, unknown>; draft: Record<string, unknown> | null }>(`/drafts/${cartId}`);
  },

  deleteDraft(cartId: string) {
    return request<{ success: boolean }>(`/drafts/${cartId}`, { method: 'DELETE' });
  },

  // ── Catalog ───────────────────────────────────────────────

  searchProducts(keyword?: string) {
    const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
    return request<Record<string, unknown>[]>(`/catalog/products${qs}`);
  },

  searchCustomers(keyword?: string) {
    const qs = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
    return request<Record<string, unknown>[]>(`/catalog/customers${qs}`);
  },
};
