import { useMemo, useState, type ComponentType } from 'react';
import { getProducts } from '../../../mocks/api';
import type { FetchProducts, ProductCartProps } from './types';

const STORAGE_KEY = 'product-cart-playground';

export default function Playground({ impl }: { impl: { default: ComponentType<ProductCartProps> } }) {
  const ProductCart = impl.default;
  const [slow, setSlow] = useState(false);
  const [flaky, setFlaky] = useState(false);
  const [instance, setInstance] = useState(0);

  const fetchProducts = useMemo<FetchProducts>(
    () => (options) => getProducts({}, { ...options, latency: slow ? 2500 : [200, 600], failRate: flaky ? 0.5 : 0 }),
    [slow, flaky],
  );

  const clearCart = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setInstance((n) => n + 1);
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', fontSize: 14 }}>
        <label>
          <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> Slow network (2.5s)
        </label>
        <label>
          <input type="checkbox" checked={flaky} onChange={(e) => setFlaky(e.target.checked)} /> Flaky API (50% failures)
        </label>
        <button type="button" onClick={() => setInstance((n) => n + 1)}>
          Remount (simulate reload)
        </button>
        <button type="button" onClick={clearCart}>
          Clear stored cart
        </button>
      </div>
      <ProductCart key={`${instance}-${slow}-${flaky}`} fetchProducts={fetchProducts} storageKey={STORAGE_KEY} />
    </div>
  );
}
