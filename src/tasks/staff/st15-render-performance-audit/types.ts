export type Category = 'Hardware' | 'Software' | 'Services' | 'Support';

export const CATEGORIES: Category[] = ['Hardware', 'Software', 'Services', 'Support'];

export interface Item {
  id: number;
  name: string;
  category: Category;
  /** Unit price in whole dollars. */
  price: number;
  stock: number;
}

export type Theme = 'light' | 'dark';

/**
 * Names reported to `onRender`. Every component calls `onRender(<its name>)` once per render,
 * and `computeStats` calls `onRender('computeStats')` once per run.
 */
export type RenderName =
  | 'Dashboard'
  | 'Header'
  | 'Clock'
  | 'ThemeToggle'
  | 'Sidebar'
  | 'FilterInput'
  | 'ItemList'
  | 'Row'
  | 'computeStats';

export interface DashboardProps {
  items: Item[];
  /** Render counter. The tests (and the Playground's counter panel) pass this in. */
  onRender?: (name: RenderName) => void;
  /** Clock source. Defaults to `Date.now`. */
  now?: () => number;
}
