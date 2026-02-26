// Shared test constants and mock data

export const TEST_STORE_HASH = 'test-store';
export const TEST_ACCESS_TOKEN = 'test-token';
export const TEST_USER_EMAIL = 'staff@example.com';
export const TEST_USER_ID = 42;

export const mockOrder = {
  id: 1001,
  status: 'Pending',
  status_id: 1,
  date_created: '2025-01-15T10:30:00Z',
  total_inc_tax: '125.00',
  subtotal_inc_tax: '110.00',
  shipping_cost_inc_tax: '15.00',
  discount_amount: '0.00',
  billing_address: {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    street_1: '123 Main St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    country: 'United States',
    phone: '555-0100',
  },
};

export const mockOrderNoEmail = {
  ...mockOrder,
  id: 1002,
  billing_address: {
    first_name: 'Jane',
    last_name: 'Doe',
    street_1: '456 Elm St',
    city: 'Dallas',
    state: 'TX',
    zip: '75201',
    country: 'United States',
  },
};

export const mockProducts = [
  {
    name: 'Widget A',
    sku: 'WA-100',
    quantity: 2,
    price_inc_tax: '30.00',
    total_inc_tax: '60.00',
  },
  {
    name: 'Widget B',
    sku: 'WB-200',
    quantity: 1,
    price_inc_tax: '50.00',
    total_inc_tax: '50.00',
  },
];

export const mockShippingAddresses = [
  {
    first_name: 'John',
    last_name: 'Doe',
    street_1: '123 Main St',
    city: 'Austin',
    state: 'TX',
    zip: '78701',
    country: 'United States',
  },
];

export const mockStoreInfo = {
  name: 'Test Store',
  secure_url: 'https://teststore.mybigcommerce.com',
  domain: 'teststore.mybigcommerce.com',
};
