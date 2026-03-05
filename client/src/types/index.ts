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

/** Draft order stored in our DB */
export interface DraftOrder {
  id: number;
  store_hash: string;
  cart_id: string;
  customer_email: string | null;
  customer_name: string | null;
  checkout_url: string | null;
  total: string | null;
  currency_code: string | null;
  status: 'open' | 'converted' | 'expired';
  created_at: string;
  updated_at: string;
}

/** Line item for creating a cart */
export interface CartLineItem {
  product_id: number;
  quantity: number;
}

/** Product from BigCommerce catalog (simplified) */
export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  images?: { url_thumbnail: string }[];
}

/** Customer from BigCommerce (simplified) */
export interface Customer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
}
