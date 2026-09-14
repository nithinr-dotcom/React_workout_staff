/*
 * RENDER PERFORMANCE AUDIT: Inventory Dashboard
 *
 * This is NOT a blank starter. The dashboard below works: filtering, theme, selection and the clock
 * all behave correctly. But users say it feels sluggish, typing in the filter lags, and the React
 * Profiler lights up every second. Your job:
 *
 *   1. Delete the NOT_STARTED line below. The correctness tests pass; the render-budget tests fail.
 *   2. Profile it (Playground → render counter panel, React DevTools Profiler) and explain WHY each
 *      component re-renders before you change anything.
 *   3. Fix it until every budget in README.md passes, without changing what the user sees.
 *   4. Fill in DESIGN.md.
 *
 * Rules: keep every onRender(...) call. Each component calls onRender with its own name once per
 * render, and computeStats calls onRender('computeStats') once per run. You can move, split, memoize
 * or restructure components freely, as long as those names keep reporting honestly.
 */
import { createContext, memo, useContext, useEffect, useState, type CSSProperties } from 'react';
import { CATEGORIES, type Category, type DashboardProps, type Item, type RenderName, type Theme } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

const noop = () => {};

interface Stats {
  countByCategory: Record<Category, number>;
  totalStockValue: number;
  medianPrice: number;
  lowStock: number;
}

interface AppContextValue {
  theme: Theme;
  toggleTheme: () => void;
  time: number;
  query: string;
  setQuery: (query: string) => void;
  selectedId: number | null;
  select: (id: number) => void;
  stats: Stats;
  onRender: (name: RenderName) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <Dashboard>');
  return value;
}

/** Summary numbers for the sidebar. Deliberately heavy: pretend it's a pricing model. */
function computeStats(items: Item[], onRender: (name: RenderName) => void): Stats {
  onRender('computeStats');
  const countByCategory = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  let totalStockValue = 0;
  let lowStock = 0;
  for (const item of items) {
    countByCategory[item.category]++;
    let weighted = 0;
    for (let i = 0; i < 4000; i++) weighted += (item.price * ((i % 7) + 1)) / 7;
    totalStockValue += Math.round(weighted / 4000) * item.stock;
    if (item.stock < 10) lowStock++;
  }
  const prices = items.map((i) => i.price).sort((a, b) => a - b);
  const medianPrice = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
  return { countByCategory, totalStockValue, medianPrice, lowStock };
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export default function Dashboard({ items, onRender = noop, now = Date.now }: DashboardProps) {
  onRender('Dashboard');
  const [time, setTime] = useState(() => now());
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState<Theme>('light');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTime(now()), 1000);
    return () => clearInterval(id);
  }, [now]);

  const stats = computeStats(items, onRender);
  const visible = items.filter((item) => normalize(item.name).includes(normalize(query)));

  const value: AppContextValue = {
    theme,
    toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    time,
    query,
    setQuery,
    selectedId,
    select: setSelectedId,
    stats,
    onRender,
  };

  return (
    <AppContext.Provider value={value}>
      <div
        className={styles.app}
        style={{ background: theme === 'dark' ? '#101828' : '#ffffff', color: theme === 'dark' ? '#f2f4f7' : '#101828' }}
      >
        <Header />
        <div className={styles.body}>
          <Sidebar />
          <main className={styles.main}>
            <FilterInput />
            <ItemList items={visible} total={items.length} />
          </main>
        </div>
      </div>
    </AppContext.Provider>
  );
}

function Header() {
  const { time, onRender } = useApp();
  onRender('Header');
  return (
    <header className={styles.header}>
      <h2 className={styles.title}>Inventory</h2>
      <Clock time={time} />
      <ThemeToggle />
    </header>
  );
}

function Clock({ time }: { time: number }) {
  const { onRender } = useApp();
  onRender('Clock');
  return <p className={styles.clock}>Time: {new Date(time).toISOString().slice(11, 19)}</p>;
}

function ThemeToggle() {
  const { theme, toggleTheme, onRender } = useApp();
  onRender('ThemeToggle');
  return (
    <button type="button" aria-pressed={theme === 'dark'} onClick={toggleTheme}>
      Dark mode
    </button>
  );
}

function Sidebar() {
  const { stats, onRender } = useApp();
  onRender('Sidebar');
  return (
    <aside className={styles.sidebar} aria-label="Summary">
      <h3 className={styles.sidebarTitle}>Summary</h3>
      <ul className={styles.stats}>
        {CATEGORIES.map((category) => (
          <li key={category}>
            {category}: {stats.countByCategory[category]}
          </li>
        ))}
      </ul>
      <p>Stock value: ${stats.totalStockValue.toLocaleString('en-US')}</p>
      <p>Median price: ${stats.medianPrice}</p>
      <p>Low stock: {stats.lowStock}</p>
    </aside>
  );
}

function FilterInput() {
  const { query, setQuery, onRender } = useApp();
  onRender('FilterInput');
  return (
    <label className={styles.filter}>
      Filter items
      <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type to filter…" />
    </label>
  );
}

function ItemList({ items, total }: { items: Item[]; total: number }) {
  const { theme, selectedId, select, onRender } = useApp();
  onRender('ItemList');
  return (
    <>
      <p className={styles.count}>
        Showing {items.length} of {total}
      </p>
      <ul className={styles.list} aria-label="Items">
        {items.map((item) => (
          <Row
            key={item.id}
            item={item}
            selected={item.id === selectedId}
            onSelect={() => select(item.id)}
            style={{
              borderColor: theme === 'dark' ? '#344054' : '#eaecf0',
              background: item.id === selectedId ? (theme === 'dark' ? '#1d2939' : '#eef4ff') : 'transparent',
            }}
          />
        ))}
      </ul>
    </>
  );
}

interface RowProps {
  item: Item;
  selected: boolean;
  onSelect: () => void;
  style: CSSProperties;
}

// "It's memoized, so it's fine."
const Row = memo(function Row({ item, selected, onSelect, style }: RowProps) {
  const { theme, onRender } = useApp();
  onRender('Row');
  return (
    <li className={styles.row} style={style}>
      <button type="button" className={styles.rowButton} aria-pressed={selected} onClick={onSelect}>
        {item.name}
      </button>
      <span className={styles.muted} style={{ color: theme === 'dark' ? '#98a2b3' : '#667085' }}>
        {item.category}
      </span>
      <span className={styles.num}>${item.price}</span>
      <span className={styles.num}>{item.stock} in stock</span>
    </li>
  );
});
