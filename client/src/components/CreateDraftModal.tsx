import { useState, useCallback } from 'react';
import {
  Modal,
  Box,
  Text,
  Input,
  Button,
  Flex,
  Message,
  ProgressCircle,
  Table,
  Small,
} from '@bigcommerce/big-design';
import { DeleteIcon } from '@bigcommerce/big-design-icons';
import { api } from '../api/client';
import { SearchAutocomplete } from './SearchAutocomplete';
import type { DraftOrder, Product, Customer } from '../types';

interface LineItem {
  product_id: number;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface CreateDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (draft: DraftOrder) => void;
}

export function CreateDraftModal({ isOpen, onClose, onCreated }: CreateDraftModalProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  // Product search
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Customer search
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) { setProductResults([]); return; }
    setSearchingProducts(true);
    try {
      const results = await api.searchProducts(query);
      setProductResults(results as unknown as Product[]);
    } catch { setProductResults([]); }
    finally { setSearchingProducts(false); }
  }, []);

  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) { setCustomerResults([]); return; }
    setSearchingCustomers(true);
    try {
      const results = await api.searchCustomers(query);
      setCustomerResults(results as unknown as Customer[]);
    } catch { setCustomerResults([]); }
    finally { setSearchingCustomers(false); }
  }, []);

  const addProduct = (product: Product) => {
    const existing = lineItems.find((li) => li.product_id === product.id);
    if (existing) {
      setLineItems(lineItems.map((li) =>
        li.product_id === product.id ? { ...li, quantity: li.quantity + 1 } : li
      ));
    } else {
      setLineItems([...lineItems, {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        quantity: 1,
      }]);
    }
    setProductQuery('');
    setProductResults([]);
  };

  const removeItem = (productId: number) => {
    setLineItems(lineItems.filter((li) => li.product_id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity < 1) return;
    setLineItems(lineItems.map((li) =>
      li.product_id === productId ? { ...li, quantity } : li
    ));
  };

  const handleCreate = async () => {
    if (lineItems.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const draft = await api.createDraft({
        line_items: lineItems.map(({ product_id, quantity }) => ({ product_id, quantity })),
        customer_id: selectedCustomer?.id,
        customer_email: selectedCustomer?.email,
        customer_name: selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : undefined,
      });
      const draftOrder = draft as unknown as DraftOrder;
      setCheckoutUrl(draftOrder.checkout_url);
      onCreated(draftOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create draft');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLineItems([]);
    setSelectedCustomer(null);
    setError(null);
    setCheckoutUrl(null);
    setProductQuery('');
    setCustomerQuery('');
    setProductResults([]);
    setCustomerResults([]);
    onClose();
  };

  // If we just created a draft, show the success view
  if (checkoutUrl) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        header="Draft Order Created"
        actions={[{ text: 'Done', onClick: handleClose }]}
      >
        <Box>
          <Message type="success" messages={[{ text: 'Draft order created successfully.' }]} marginBottom="medium" />
          <Text bold>Checkout URL:</Text>
          <Input
            value={checkoutUrl}
            readOnly
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Small>Copy this URL and send it to your customer.</Small>
        </Box>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      header="Create Draft Order"
      actions={[
        { text: 'Cancel', variant: 'subtle', onClick: handleClose },
        {
          text: loading ? 'Creating...' : 'Create Draft',
          onClick: handleCreate,
          disabled: loading || lineItems.length === 0,
        },
      ]}
    >
      <Box>
        {error && <Message type="error" messages={[{ text: error }]} marginBottom="medium" />}

        {/* Customer Search */}
        <Box marginBottom="medium">
          <Text bold marginBottom="xSmall">Customer (optional)</Text>
          {selectedCustomer ? (
            <Flex alignItems="center" flexGap="0.5rem">
              <Text marginBottom="none">
                {selectedCustomer.first_name} {selectedCustomer.last_name} ({selectedCustomer.email})
              </Text>
              <Button variant="subtle" onClick={() => setSelectedCustomer(null)}>Change</Button>
            </Flex>
          ) : (
            <SearchAutocomplete<Customer>
              placeholder="Search customers by name..."
              value={customerQuery}
              onChange={(q) => {
                setCustomerQuery(q);
                searchCustomers(q);
              }}
              results={customerResults}
              isLoading={searchingCustomers}
              getKey={(c) => c.id}
              onSelect={(c) => {
                setSelectedCustomer(c);
                setCustomerQuery('');
                setCustomerResults([]);
              }}
              renderItem={(c) => (
                <Text marginBottom="none">{c.first_name} {c.last_name} — {c.email}</Text>
              )}
            />
          )}
        </Box>

        {/* Product Search */}
        <Box marginBottom="medium">
          <Text bold marginBottom="xSmall">Add Products</Text>
          <SearchAutocomplete<Product>
            placeholder="Search products by name or SKU..."
            value={productQuery}
            onChange={(q) => {
              setProductQuery(q);
              searchProducts(q);
            }}
            results={productResults}
            isLoading={searchingProducts}
            getKey={(p) => p.id}
            onSelect={addProduct}
            renderItem={(p) => (
              <Text marginBottom="none">{p.name} {p.sku ? `(${p.sku})` : ''} — ${p.price}</Text>
            )}
          />
        </Box>

        {/* Line Items Table */}
        {lineItems.length > 0 && (
          <Table
            columns={[
              { header: 'Product', hash: 'name', render: (item: LineItem) => <Text marginBottom="none">{item.name}</Text> },
              { header: 'SKU', hash: 'sku', render: (item: LineItem) => <Text marginBottom="none">{item.sku || '—'}</Text> },
              { header: 'Price', hash: 'price', render: (item: LineItem) => <Text marginBottom="none">${item.price.toFixed(2)}</Text> },
              {
                header: 'Qty',
                hash: 'quantity',
                render: (item: LineItem) => (
                  <Input
                    type="number"
                    value={String(item.quantity)}
                    onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value, 10) || 1)}
                    style={{ width: 70 }}
                  />
                ),
              },
              {
                header: '',
                hash: 'actions',
                render: (item: LineItem) => (
                  <Button variant="subtle" onClick={() => removeItem(item.product_id)} iconOnly={<DeleteIcon />} />
                ),
              },
            ]}
            items={lineItems}
          />
        )}

        {loading && (
          <Flex justifyContent="center" marginTop="medium">
            <ProgressCircle size="small" />
          </Flex>
        )}
      </Box>
    </Modal>
  );
}
