// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { CartLine, FetchProducts, Product } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const ProductCart = impl.default;

const PRODUCTS: Product[] = [
  { id: 1, title: 'Wireless Earbuds', category: 'Audio', brand: 'Acme', price: 49.99, rating: 4.2, stock: 3 },
  { id: 2, title: 'Studio Headphones', category: 'Audio', brand: 'Nimbus', price: 199, rating: 4.8, stock: 5 },
  { id: 3, title: 'Budget Phone', category: 'Phones', brand: 'Volt', price: 120.5, rating: 3.9, stock: 0 },
  { id: 4, title: 'USB-C Hub', category: 'Accessories', brand: 'Kite', price: 25, rating: 4.5, stock: 10 },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const resolvedFetch = () => vi.fn<FetchProducts>(() => Promise.resolve(structuredClone(PRODUCTS)));

async function renderLoaded(props: { storageKey?: string } = {}) {
  const fetchProducts = resolvedFetch();
  const utils = render(<ProductCart fetchProducts={fetchProducts} {...props} />);
  await screen.findByRole('article', { name: 'Wireless Earbuds' });
  return { ...utils, fetchProducts };
}

const product = (name: string) => screen.getByRole('article', { name });
const cart = () => screen.getByRole('region', { name: 'Cart' });
const addToCart = (user: ReturnType<typeof userEvent.setup>, name: string) =>
  user.click(within(product(name)).getByRole('button', { name: 'Add to cart' }));
const articleNames = () => screen.getAllByRole('article').map((a) => PRODUCTS.find((p) => a.textContent?.includes(p.title))?.title);

describeTask('ProductCart', () => {
  it('shows a loading state, then the products, calling fetchProducts once with a signal', async () => {
    const d = deferred<Product[]>();
    const fetchProducts = vi.fn<FetchProducts>(() => d.promise);
    render(<ProductCart fetchProducts={fetchProducts} />);

    expect(screen.getByText(/loading products/i)).toBeInTheDocument();
    expect(fetchProducts).toHaveBeenCalledTimes(1);
    expect(fetchProducts.mock.calls[0][0].signal).toBeInstanceOf(AbortSignal);

    d.resolve(structuredClone(PRODUCTS));
    const earbuds = await screen.findByRole('article', { name: 'Wireless Earbuds' });
    expect(within(earbuds).getByText('$49.99')).toBeInTheDocument();
    expect(within(product('Budget Phone')).getByText('$120.50')).toBeInTheDocument();
    expect(screen.queryByText(/loading products/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(4);
  });

  it('aborts the request on unmount', () => {
    const d = deferred<Product[]>();
    const fetchProducts = vi.fn<FetchProducts>(() => d.promise);
    const { unmount } = render(<ProductCart fetchProducts={fetchProducts} />);
    const { signal } = fetchProducts.mock.calls[0][0];
    unmount();
    expect(signal.aborted).toBe(true);
  });

  it('shows an error with Retry, and retrying loads the products', async () => {
    const user = userEvent.setup();
    const fetchProducts = vi
      .fn<FetchProducts>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockImplementation(() => Promise.resolve(structuredClone(PRODUCTS)));
    render(<ProductCart fetchProducts={fetchProducts} />);

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load products");
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('article', { name: 'USB-C Hub' })).toBeInTheDocument();
    expect(fetchProducts).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('filters by category and by case-insensitive search, with an empty state', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    await user.selectOptions(screen.getByLabelText('Category'), 'Audio');
    expect(articleNames()).toEqual(['Wireless Earbuds', 'Studio Headphones']);

    await user.type(screen.getByLabelText('Search products'), '  STUDIO ');
    expect(articleNames()).toEqual(['Studio Headphones']);

    await user.clear(screen.getByLabelText('Search products'));
    await user.type(screen.getByLabelText('Search products'), 'hub');
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByText('No products match your filters')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Category'), 'All categories');
    expect(articleNames()).toEqual(['USB-C Hub']);
  });

  it('sorts by price and rating, and back to catalogue order', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    const sort = screen.getByLabelText('Sort by');

    await user.selectOptions(sort, 'Price: low to high');
    expect(articleNames()).toEqual(['USB-C Hub', 'Wireless Earbuds', 'Budget Phone', 'Studio Headphones']);
    await user.selectOptions(sort, 'Price: high to low');
    expect(articleNames()).toEqual(['Studio Headphones', 'Budget Phone', 'Wireless Earbuds', 'USB-C Hub']);
    await user.selectOptions(sort, 'Rating: high to low');
    expect(articleNames()).toEqual(['Studio Headphones', 'USB-C Hub', 'Wireless Earbuds', 'Budget Phone']);
    await user.selectOptions(sort, 'Featured');
    expect(articleNames()).toEqual(['Wireless Earbuds', 'Studio Headphones', 'Budget Phone', 'USB-C Hub']);
  });

  it('adds products to the cart and increments quantity when added again', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    expect(within(cart()).getByText('Your cart is empty')).toBeInTheDocument();

    await addToCart(user, 'USB-C Hub');
    expect(within(cart()).getAllByRole('listitem')).toHaveLength(1);
    expect(within(cart()).getByLabelText('Quantity of USB-C Hub')).toHaveValue(1);
    expect(within(cart()).getByText('1 item')).toBeInTheDocument();

    await addToCart(user, 'USB-C Hub');
    await addToCart(user, 'Wireless Earbuds');
    expect(within(cart()).getAllByRole('listitem')).toHaveLength(2);
    expect(within(cart()).getByLabelText('Quantity of USB-C Hub')).toHaveValue(2);
    expect(within(cart()).getByText('3 items')).toBeInTheDocument();
  });

  it('enforces stock limits', async () => {
    const user = userEvent.setup();
    await renderLoaded();

    const phone = product('Budget Phone');
    expect(within(phone).getByText('Out of stock')).toBeInTheDocument();
    expect(within(phone).getByRole('button', { name: 'Add to cart' })).toBeDisabled();
    expect(within(product('Wireless Earbuds')).getByText('Only 3 left')).toBeInTheDocument();

    await addToCart(user, 'Wireless Earbuds');
    const increase = within(cart()).getByRole('button', { name: 'Increase quantity of Wireless Earbuds' });
    await user.click(increase);
    await user.click(increase);
    expect(within(cart()).getByLabelText('Quantity of Wireless Earbuds')).toHaveValue(3);
    expect(within(cart()).getByRole('button', { name: 'Increase quantity of Wireless Earbuds' })).toBeDisabled();
    expect(within(product('Wireless Earbuds')).getByRole('button', { name: 'Add to cart' })).toBeDisabled();
  });

  it('decreasing at quantity 1 removes the line, and Remove deletes a line', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await addToCart(user, 'Wireless Earbuds');
    await addToCart(user, 'Wireless Earbuds');
    await addToCart(user, 'USB-C Hub');

    await user.click(within(cart()).getByRole('button', { name: 'Decrease quantity of Wireless Earbuds' }));
    expect(within(cart()).getByLabelText('Quantity of Wireless Earbuds')).toHaveValue(1);
    await user.click(within(cart()).getByRole('button', { name: 'Decrease quantity of Wireless Earbuds' }));
    expect(within(cart()).queryByLabelText('Quantity of Wireless Earbuds')).not.toBeInTheDocument();

    await user.click(within(cart()).getByRole('button', { name: 'Remove USB-C Hub' }));
    expect(within(cart()).getByText('Your cart is empty')).toBeInTheDocument();
    expect(within(cart()).queryByRole('status', { name: 'Total' })).not.toBeInTheDocument();
  });

  it('computes subtotal, shipping threshold and total with currency formatting', async () => {
    const user = userEvent.setup();
    await renderLoaded();
    await addToCart(user, 'Wireless Earbuds');
    await addToCart(user, 'Wireless Earbuds');

    expect(within(cart()).getByRole('status', { name: 'Subtotal' })).toHaveTextContent('$99.98');
    expect(within(cart()).getByRole('status', { name: 'Shipping' })).toHaveTextContent('$9.99');
    expect(within(cart()).getByRole('status', { name: 'Total' })).toHaveTextContent('$109.97');

    await addToCart(user, 'Studio Headphones');
    await user.click(within(cart()).getByRole('button', { name: 'Increase quantity of Studio Headphones' }));
    await user.click(within(cart()).getByRole('button', { name: 'Increase quantity of Studio Headphones' }));
    await user.click(within(cart()).getByRole('button', { name: 'Increase quantity of Studio Headphones' }));
    await user.click(within(cart()).getByRole('button', { name: 'Increase quantity of Studio Headphones' }));
    // 2 × 49.99 + 5 × 199 = 1,094.98
    expect(within(cart()).getByRole('status', { name: 'Subtotal' })).toHaveTextContent('$1,094.98');
    expect(within(cart()).getByRole('status', { name: 'Shipping' })).toHaveTextContent('Free');
    expect(within(cart()).getByRole('status', { name: 'Total' })).toHaveTextContent('$1,094.98');
  });

  it('persists the cart to localStorage and restores it on the next mount', async () => {
    const user = userEvent.setup();
    const { unmount } = await renderLoaded();
    await addToCart(user, 'USB-C Hub');
    await addToCart(user, 'Wireless Earbuds');
    await addToCart(user, 'USB-C Hub');

    const stored = JSON.parse(localStorage.getItem('product-cart') ?? 'null') as CartLine[];
    expect(stored).toEqual([
      { productId: 4, quantity: 2 },
      { productId: 1, quantity: 1 },
    ]);

    unmount();
    await renderLoaded();
    expect(await within(cart()).findByLabelText('Quantity of USB-C Hub')).toHaveValue(2);
    expect(within(cart()).getByLabelText('Quantity of Wireless Earbuds')).toHaveValue(1);
  });

  it('reconciles a stored cart with the catalogue without wiping it while loading', async () => {
    const seeded: CartLine[] = [
      { productId: 1, quantity: 10 },
      { productId: 999, quantity: 1 },
      { productId: 3, quantity: 1 },
    ];
    localStorage.setItem('my-cart', JSON.stringify(seeded));

    const d = deferred<Product[]>();
    render(<ProductCart fetchProducts={() => d.promise} storageKey="my-cart" />);
    expect(JSON.parse(localStorage.getItem('my-cart') ?? 'null')).toEqual(seeded);

    d.resolve(structuredClone(PRODUCTS));
    expect(await within(cart()).findByLabelText('Quantity of Wireless Earbuds')).toHaveValue(3);
    expect(within(cart()).getAllByRole('listitem')).toHaveLength(1);
    expect(within(cart()).queryByText('Budget Phone')).not.toBeInTheDocument();
  });
});
