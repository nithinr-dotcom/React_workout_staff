import { FIRST_NAMES, LAST_NAMES, mulberry32, pick } from './generate';

/* ---------- countries (autocomplete, dropdowns) ---------- */

export interface Country {
  code: string;
  name: string;
  region: 'Africa' | 'Americas' | 'Asia' | 'Europe' | 'Oceania';
  population: number;
}

const COUNTRY_ROWS: [string, string, Country['region'], number][] = [
  ['AR', 'Argentina', 'Americas', 45], ['AU', 'Australia', 'Oceania', 26], ['AT', 'Austria', 'Europe', 9],
  ['BD', 'Bangladesh', 'Asia', 171], ['BE', 'Belgium', 'Europe', 12], ['BR', 'Brazil', 'Americas', 216],
  ['BG', 'Bulgaria', 'Europe', 6], ['CA', 'Canada', 'Americas', 39], ['CL', 'Chile', 'Americas', 19],
  ['CN', 'China', 'Asia', 1410], ['CO', 'Colombia', 'Americas', 52], ['HR', 'Croatia', 'Europe', 4],
  ['CZ', 'Czechia', 'Europe', 11], ['DK', 'Denmark', 'Europe', 6], ['EG', 'Egypt', 'Africa', 112],
  ['EE', 'Estonia', 'Europe', 1], ['ET', 'Ethiopia', 'Africa', 126], ['FI', 'Finland', 'Europe', 6],
  ['FR', 'France', 'Europe', 68], ['DE', 'Germany', 'Europe', 84], ['GH', 'Ghana', 'Africa', 34],
  ['GR', 'Greece', 'Europe', 10], ['HU', 'Hungary', 'Europe', 10], ['IS', 'Iceland', 'Europe', 0.4],
  ['IN', 'India', 'Asia', 1430], ['ID', 'Indonesia', 'Asia', 277], ['IE', 'Ireland', 'Europe', 5],
  ['IL', 'Israel', 'Asia', 10], ['IT', 'Italy', 'Europe', 59], ['JP', 'Japan', 'Asia', 124],
  ['JO', 'Jordan', 'Asia', 11], ['KE', 'Kenya', 'Africa', 55], ['KR', 'South Korea', 'Asia', 52],
  ['LV', 'Latvia', 'Europe', 2], ['LT', 'Lithuania', 'Europe', 3], ['MY', 'Malaysia', 'Asia', 34],
  ['MX', 'Mexico', 'Americas', 128], ['MA', 'Morocco', 'Africa', 37], ['NP', 'Nepal', 'Asia', 31],
  ['NL', 'Netherlands', 'Europe', 18], ['NZ', 'New Zealand', 'Oceania', 5], ['NG', 'Nigeria', 'Africa', 224],
  ['NO', 'Norway', 'Europe', 5], ['PK', 'Pakistan', 'Asia', 240], ['PE', 'Peru', 'Americas', 34],
  ['PH', 'Philippines', 'Asia', 117], ['PL', 'Poland', 'Europe', 37], ['PT', 'Portugal', 'Europe', 10],
  ['QA', 'Qatar', 'Asia', 3], ['RO', 'Romania', 'Europe', 19], ['SA', 'Saudi Arabia', 'Asia', 37],
  ['SN', 'Senegal', 'Africa', 18], ['RS', 'Serbia', 'Europe', 7], ['SG', 'Singapore', 'Asia', 6],
  ['ZA', 'South Africa', 'Africa', 60], ['ES', 'Spain', 'Europe', 48], ['LK', 'Sri Lanka', 'Asia', 22],
  ['SE', 'Sweden', 'Europe', 10], ['CH', 'Switzerland', 'Europe', 9], ['TW', 'Taiwan', 'Asia', 23],
  ['TZ', 'Tanzania', 'Africa', 67], ['TH', 'Thailand', 'Asia', 72], ['TR', 'Türkiye', 'Asia', 85],
  ['UG', 'Uganda', 'Africa', 48], ['UA', 'Ukraine', 'Europe', 37], ['AE', 'United Arab Emirates', 'Asia', 10],
  ['GB', 'United Kingdom', 'Europe', 68], ['US', 'United States', 'Americas', 335], ['UY', 'Uruguay', 'Americas', 3],
  ['VN', 'Vietnam', 'Asia', 99], ['ZM', 'Zambia', 'Africa', 20], ['ZW', 'Zimbabwe', 'Africa', 16],
];

export const COUNTRIES: Country[] = COUNTRY_ROWS.map(([code, name, region, millions]) => ({
  code,
  name,
  region,
  population: Math.round(millions * 1_000_000),
}));

/* ---------- users (tables, directories) ---------- */

export type Role = 'Engineer' | 'Designer' | 'Manager' | 'Product' | 'Support';
export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: 'Platform' | 'Growth' | 'Payments' | 'Search' | 'Mobile';
  age: number;
  active: boolean;
  joinedAt: string;
}

export const USERS: User[] = (() => {
  const rand = mulberry32(42);
  return Array.from({ length: 120 }, (_, i) => {
    const first = pick(rand, FIRST_NAMES);
    const last = pick(rand, LAST_NAMES);
    const joined = new Date(2016 + Math.floor(rand() * 10), Math.floor(rand() * 12), 1 + Math.floor(rand() * 28));
    return {
      id: i + 1,
      name: `${first} ${last}`,
      email: `${first}.${last}${i}@example.com`.toLowerCase(),
      role: pick(rand, ['Engineer', 'Designer', 'Manager', 'Product', 'Support'] as const),
      department: pick(rand, ['Platform', 'Growth', 'Payments', 'Search', 'Mobile'] as const),
      age: 21 + Math.floor(rand() * 40),
      active: rand() > 0.2,
      joinedAt: joined.toISOString().slice(0, 10),
    };
  });
})();

/* ---------- products (listing, cart) ---------- */

export interface Product {
  id: number;
  title: string;
  category: 'Audio' | 'Laptops' | 'Phones' | 'Wearables' | 'Accessories';
  brand: string;
  price: number;
  rating: number;
  stock: number;
}

export const PRODUCTS: Product[] = (() => {
  const rand = mulberry32(7);
  const byCategory: Record<Product['category'], string[]> = {
    Audio: ['Wireless Earbuds', 'Studio Headphones', 'Bluetooth Speaker', 'Soundbar'],
    Laptops: ['Ultrabook 13"', 'Pro Laptop 16"', 'Gaming Laptop', 'Chromebook'],
    Phones: ['Flagship Phone', 'Budget Phone', 'Foldable Phone', 'Compact Phone'],
    Wearables: ['Smartwatch', 'Fitness Band', 'Smart Ring', 'VR Headset'],
    Accessories: ['USB-C Hub', 'Mechanical Keyboard', 'Wireless Mouse', 'Laptop Stand', 'Power Bank'],
  };
  const brands = ['Acme', 'Nimbus', 'Volt', 'Orbit', 'Kite'];
  const list: Product[] = [];
  let id = 1;
  for (const [category, titles] of Object.entries(byCategory) as [Product['category'], string[]][]) {
    for (const title of titles) {
      for (let v = 0; v < 2; v++) {
        list.push({
          id: id++,
          title: v === 0 ? title : `${title} Plus`,
          category,
          brand: pick(rand, brands),
          price: Math.round((20 + rand() * 1500) * 100) / 100,
          rating: Math.round((2.5 + rand() * 2.5) * 10) / 10,
          stock: Math.floor(rand() * 25),
        });
      }
    }
  }
  return list;
})();

/* ---------- comments (nested comments) ---------- */

export interface CommentNode {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  votes: number;
  replies: CommentNode[];
}

export const COMMENTS: CommentNode[] = [
  {
    id: 'c1', author: 'priya', text: 'Is virtualization worth it for a 500-row table?', createdAt: '2026-08-01T10:00:00Z', votes: 12,
    replies: [
      {
        id: 'c2', author: 'ben', text: 'Measure first. 500 simple rows usually render fine.', createdAt: '2026-08-01T10:05:00Z', votes: 8,
        replies: [
          { id: 'c3', author: 'priya', text: 'They each have 3 inputs and a menu though.', createdAt: '2026-08-01T10:09:00Z', votes: 2, replies: [] },
        ],
      },
      { id: 'c4', author: 'hana', text: 'content-visibility: auto is a cheap first step.', createdAt: '2026-08-01T11:00:00Z', votes: 5, replies: [] },
    ],
  },
  { id: 'c5', author: 'omar', text: 'Anyone tried the new View Transitions API in production?', createdAt: '2026-08-02T09:00:00Z', votes: 3, replies: [] },
];

/* ---------- file tree (file explorer) ---------- */

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

export const FILE_TREE: FileNode[] = [
  {
    id: 'src', name: 'src', type: 'folder', children: [
      {
        id: 'src/components', name: 'components', type: 'folder', children: [
          { id: 'src/components/Button.tsx', name: 'Button.tsx', type: 'file' },
          { id: 'src/components/Modal.tsx', name: 'Modal.tsx', type: 'file' },
        ],
      },
      { id: 'src/hooks', name: 'hooks', type: 'folder', children: [{ id: 'src/hooks/useFetch.ts', name: 'useFetch.ts', type: 'file' }] },
      { id: 'src/App.tsx', name: 'App.tsx', type: 'file' },
      { id: 'src/main.tsx', name: 'main.tsx', type: 'file' },
    ],
  },
  { id: 'public', name: 'public', type: 'folder', children: [{ id: 'public/favicon.svg', name: 'favicon.svg', type: 'file' }] },
  { id: 'package.json', name: 'package.json', type: 'file' },
  { id: 'README.md', name: 'README.md', type: 'file' },
];

/* ---------- feed (infinite scroll) ---------- */

export interface Post {
  id: number;
  author: string;
  body: string;
  likes: number;
  createdAt: string;
}

const LOREM = [
  'Shipped the new onboarding flow today.', 'Hot take: most global state should be server cache.',
  'Debugging a race condition in our autocomplete.', 'Finally migrated the design system to CSS variables.',
  'Accessibility audit found 40 issues, fixed 38.', 'Lighthouse score went from 62 to 94 after code splitting.',
  'Wrote tests before the refactor. Zero regressions.', 'Pairing on a virtualized grid this afternoon.',
];

export const POSTS: Post[] = (() => {
  const rand = mulberry32(99);
  return Array.from({ length: 300 }, (_, i) => ({
    id: i + 1,
    author: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`,
    body: `${pick(rand, LOREM)} ${rand() > 0.5 ? pick(rand, LOREM) : ''}`.trim(),
    likes: Math.floor(rand() * 500),
    createdAt: new Date(Date.UTC(2026, 7, 30) - i * 3_600_000).toISOString(),
  }));
})();

/* ---------- jobs (job board) ---------- */

export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  postedAt: string;
  url: string;
}

export const JOBS: Job[] = (() => {
  const rand = mulberry32(2024);
  const titles = ['Frontend Engineer', 'Senior React Developer', 'Staff UI Engineer', 'Design Systems Engineer', 'Full-stack Engineer'];
  const companies = ['Acme', 'Nimbus', 'Orbit Labs', 'Kite Pay', 'Volt Mobility', 'Northwind'];
  const places = ['Remote', 'Bengaluru', 'Berlin', 'London', 'New York', 'Singapore'];
  return Array.from({ length: 60 }, (_, i) => ({
    id: 1000 + i,
    title: pick(rand, titles),
    company: pick(rand, companies),
    location: pick(rand, places),
    postedAt: new Date(Date.UTC(2026, 8, 1) - i * 86_400_000 * 0.7).toISOString(),
    url: `https://jobs.example.com/${1000 + i}`,
  }));
})();

/* ---------- words (wordle) ---------- */

export const WORDS = [
  'react', 'state', 'props', 'hooks', 'fiber', 'redux', 'store', 'query', 'cache', 'fetch', 'async', 'await',
  'event', 'focus', 'modal', 'input', 'label', 'table', 'debug', 'build', 'bundle', 'style', 'theme', 'color',
  'pixel', 'frame', 'layer', 'scope', 'class', 'array', 'value', 'field', 'error', 'retry', 'queue', 'stack',
  'graph', 'nodes', 'route', 'links', 'image', 'video', 'audio', 'canvas', 'chart', 'grids', 'lists', 'cards',
].filter((w) => w.length === 5);

/* ---------- dictionary & weather (search apps) ---------- */

export const DICTIONARY: Record<string, { partOfSpeech: string; definition: string }[]> = {
  closure: [{ partOfSpeech: 'noun', definition: 'A function bundled with references to its surrounding lexical scope.' }],
  debounce: [{ partOfSpeech: 'verb', definition: 'Delay calling a function until input has stopped for a period.' }],
  hydrate: [{ partOfSpeech: 'verb', definition: 'Attach event handlers to server-rendered HTML on the client.' }],
  memoize: [{ partOfSpeech: 'verb', definition: 'Cache the result of a function call for the same inputs.' }],
  reconcile: [{ partOfSpeech: 'verb', definition: 'Compute the minimal set of changes between two UI trees.' }],
  throttle: [{ partOfSpeech: 'verb', definition: 'Limit how often a function can run in a time window.' }],
  virtualize: [{ partOfSpeech: 'verb', definition: 'Render only the visible slice of a large list.' }],
};

export interface Weather {
  city: string;
  tempC: number;
  condition: 'Sunny' | 'Cloudy' | 'Rain' | 'Storm' | 'Snow';
  humidity: number;
}

export const WEATHER: Weather[] = [
  { city: 'Bengaluru', tempC: 24, condition: 'Cloudy', humidity: 71 },
  { city: 'Berlin', tempC: 14, condition: 'Rain', humidity: 80 },
  { city: 'Kochi', tempC: 29, condition: 'Rain', humidity: 88 },
  { city: 'London', tempC: 12, condition: 'Cloudy', humidity: 76 },
  { city: 'New York', tempC: 19, condition: 'Sunny', humidity: 55 },
  { city: 'Singapore', tempC: 31, condition: 'Storm', humidity: 90 },
  { city: 'Tokyo', tempC: 22, condition: 'Sunny', humidity: 60 },
  { city: 'Oslo', tempC: -2, condition: 'Snow', humidity: 85 },
];
