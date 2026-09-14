import { getProducts } from '../../../mocks/api';
import type { FetchProducts, ProductCartProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

const defaultFetchProducts: FetchProducts = (options) => getProducts({}, options);

export default function ProductCart({ fetchProducts = defaultFetchProducts, storageKey = 'product-cart' }: ProductCartProps) {
  // Your implementation here. Requirements are in README.md.
  void fetchProducts;
  void storageKey;
  return <div className={styles.root}>ProductCart: start coding in Solution.tsx</div>;
}
