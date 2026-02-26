/** BigCommerce V2 Order (relevant fields) */
export interface Order {
  id: number;
  customer_id: number;
  status: string;
  status_id: number;
  total_inc_tax: string;
  subtotal_inc_tax: string;
  shipping_cost_inc_tax: string;
  discount_amount: string;
  items_total: number;
  currency_code: string;
  date_created: string;
  date_modified: string;
  billing_address: Address;
  products: OrderProduct[];
}

export interface Address {
  first_name: string;
  last_name: string;
  email: string;
  street_1?: string;
  street_2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

export interface OrderProduct {
  id: number;
  name: string;
  quantity: number;
  price_inc_tax: string;
  total_inc_tax: string;
  sku: string;
}

export interface Note {
  id: number;
  store_hash: string;
  order_id: number;
  author: string;
  content: string;
  created_at: string;
}

/** Lightweight order for list display (no products needed) */
export interface OrderListItem {
  id: number;
  status: string;
  status_id: number;
  total_inc_tax: string;
  currency_code: string;
  date_created: string;
  billing_address: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export type ActionView = 'print' | 'send' | 'message' | 'notes';
