import type { Product } from '../../../mocks/api';

export type { Product };

/** Loads the full catalogue. Must honour `signal`. */
export type FetchProducts = (options: { signal: AbortSignal }) => Promise<Product[]>;

/** What is persisted to localStorage: product ids and quantities only, never prices. */
export interface CartLine {
  productId: number;
  quantity: number;
}

export interface ProductCartProps {
  /** Default: `(options) => getProducts({}, options)` from `src/mocks/api.ts`. */
  fetchProducts?: FetchProducts;
  /** localStorage key for the cart. Default: "product-cart". */
  storageKey?: string;
}
