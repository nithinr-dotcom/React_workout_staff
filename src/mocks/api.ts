/*
 * Fake backend for tasks. Every function:
 *  - resolves after a random latency (default 200–600ms)
 *  - supports AbortSignal (rejects with a DOMException named "AbortError")
 *  - can fail randomly via `failRate` so you can practice error + retry states
 *
 * Tweak globally from the browser console: window.__mockApi.configure({ latency: [1000, 2000], failRate: 0.3 })
 */
import {
  COMMENTS,
  COUNTRIES,
  DICTIONARY,
  FILE_TREE,
  JOBS,
  POSTS,
  PRODUCTS,
  USERS,
  WEATHER,
  type CommentNode,
  type Country,
  type FileNode,
  type Job,
  type Post,
  type Product,
  type User,
  type Weather,
} from './data/datasets';

export type { CommentNode, Country, FileNode, Job, Post, Product, User, Weather };

export interface RequestOptions {
  signal?: AbortSignal;
  /** Fixed ms or [min, max] range. */
  latency?: number | [number, number];
  /** 0..1 probability that the call rejects with an ApiError. */
  failRate?: number;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const defaults: Required<Pick<RequestOptions, 'latency' | 'failRate'>> = {
  latency: [200, 600],
  failRate: 0,
};

export function configure(options: Partial<typeof defaults>) {
  Object.assign(defaults, options);
}

if (typeof window !== 'undefined') {
  (window as unknown as { __mockApi: unknown }).__mockApi = { configure, defaults };
}

const clone = <T>(value: T): T => structuredClone(value);

function request<T>(produce: () => T, options: RequestOptions = {}): Promise<T> {
  const latency = options.latency ?? defaults.latency;
  const failRate = options.failRate ?? defaults.failRate;
  const ms = Array.isArray(latency) ? latency[0] + Math.random() * (latency[1] - latency[0]) : latency;

  return new Promise<T>((resolve, reject) => {
    const { signal } = options;
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      if (Math.random() < failRate) {
        reject(new ApiError('Mock server error, please retry.'));
        return;
      }
      try {
        resolve(clone(produce()));
      } catch (e) {
        reject(e);
      }
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/* ---------- search ---------- */

export function searchCountries(query: string, options?: RequestOptions): Promise<Country[]> {
  return request(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 10);
  }, options);
}

export function getCountries(options?: RequestOptions): Promise<Country[]> {
  return request(() => COUNTRIES, options);
}

export function lookupWord(word: string, options?: RequestOptions) {
  return request(() => {
    const entry = DICTIONARY[word.trim().toLowerCase()];
    if (!entry) throw new ApiError(`No definition found for "${word}"`, 404);
    return { word: word.trim().toLowerCase(), meanings: entry };
  }, options);
}

export function getWeather(city: string, options?: RequestOptions): Promise<Weather> {
  return request(() => {
    const found = WEATHER.find((w) => w.city.toLowerCase() === city.trim().toLowerCase());
    if (!found) throw new ApiError(`City "${city}" not found`, 404);
    return found;
  }, options);
}

/* ---------- cursor pagination ---------- */

export interface Page<T> {
  items: T[];
  nextCursor: number | null;
  total: number;
}

export function getFeed(params: { cursor?: number | null; limit?: number } = {}, options?: RequestOptions): Promise<Page<Post>> {
  return request(() => {
    const start = params.cursor ?? 0;
    const limit = params.limit ?? 10;
    const items = POSTS.slice(start, start + limit);
    const next = start + limit;
    return { items, nextCursor: next < POSTS.length ? next : null, total: POSTS.length };
  }, options);
}

/* ---------- offset pagination + filters ---------- */

export interface UsersQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: User['role'];
  sortBy?: keyof User;
  sortDir?: 'asc' | 'desc';
}

export function getUsers(query: UsersQuery = {}, options?: RequestOptions) {
  return request(() => {
    const { page = 1, pageSize = 10, search = '', role, sortBy, sortDir = 'asc' } = query;
    let rows = USERS.filter(
      (u) =>
        (!role || u.role === role) &&
        (!search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search.toLowerCase())),
    );
    if (sortBy) {
      rows = [...rows].sort((a, b) => {
        const cmp = String(a[sortBy]).localeCompare(String(b[sortBy]), undefined, { numeric: true });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
  }, options);
}

let usersDb = clone(USERS);
export function getAllUsers(options?: RequestOptions) {
  return request(() => usersDb, options);
}
export function saveUser(user: Omit<User, 'id'> & { id?: number }, options?: RequestOptions): Promise<User> {
  return request(() => {
    if (user.id) {
      usersDb = usersDb.map((u) => (u.id === user.id ? { ...u, ...user, id: u.id } : u));
      return usersDb.find((u) => u.id === user.id)!;
    }
    const created = { ...user, id: Math.max(...usersDb.map((u) => u.id)) + 1 } as User;
    usersDb = [...usersDb, created];
    return created;
  }, options);
}
export function deleteUser(id: number, options?: RequestOptions) {
  return request(() => {
    usersDb = usersDb.filter((u) => u.id !== id);
    return { ok: true as const };
  }, options);
}

export function getProducts(
  filters: { category?: Product['category']; search?: string; maxPrice?: number } = {},
  options?: RequestOptions,
): Promise<Product[]> {
  return request(
    () =>
      PRODUCTS.filter(
        (p) =>
          (!filters.category || p.category === filters.category) &&
          (!filters.search || p.title.toLowerCase().includes(filters.search.toLowerCase())) &&
          (filters.maxPrice === undefined || p.price <= filters.maxPrice),
      ),
    options,
  );
}

/* ---------- trees ---------- */

export function getComments(options?: RequestOptions): Promise<CommentNode[]> {
  return request(() => COMMENTS, options);
}

export function getFileTree(options?: RequestOptions): Promise<FileNode[]> {
  return request(() => FILE_TREE, options);
}

/* ---------- job board (ids then details, like the Hacker News API) ---------- */

export function getJobIds(options?: RequestOptions): Promise<number[]> {
  return request(() => JOBS.map((j) => j.id), options);
}

export function getJob(id: number, options?: RequestOptions): Promise<Job> {
  return request(() => {
    const job = JOBS.find((j) => j.id === id);
    if (!job) throw new ApiError(`Job ${id} not found`, 404);
    return job;
  }, options);
}

/* ---------- simple mutations ---------- */

export function toggleLike(postId: number, liked: boolean, options?: RequestOptions) {
  return request(() => ({ postId, liked }), { failRate: 0.2, ...options });
}

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  updatedAt: number;
}

let todosDb: Todo[] = [];
export function getTodos(options?: RequestOptions) {
  return request(() => todosDb, options);
}
export function saveTodo(todo: Todo, options?: RequestOptions): Promise<Todo> {
  return request(() => {
    const existing = todosDb.find((t) => t.id === todo.id);
    // last-write-wins by updatedAt
    if (existing && existing.updatedAt > todo.updatedAt) return existing;
    todosDb = existing ? todosDb.map((t) => (t.id === todo.id ? todo : t)) : [...todosDb, todo];
    return todo;
  }, options);
}
export function deleteTodo(id: string, options?: RequestOptions) {
  return request(() => {
    todosDb = todosDb.filter((t) => t.id !== id);
    return { ok: true as const };
  }, options);
}

/** Reset mutable mock databases (used by tests). */
export function __resetMockDb() {
  usersDb = clone(USERS);
  todosDb = [];
}
