/* ---------- Part A: LazyMan ---------- */

export interface ILazyMan {
  /** Queues "Eat <food>." */
  eat(food: string): ILazyMan;
  /** Queues a pause of `seconds`, then "Wake up after <n> second(s)." */
  sleep(seconds: number): ILazyMan;
  /** Like sleep, but runs before every other task, including the greeting. */
  sleepFirst(seconds: number): ILazyMan;
}

/* ---------- Part B: fluent API client ---------- */

/** The subset of `Response` the client uses. */
export interface ResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface RequestInitLike {
  method: string;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
}

export type FetchLike = (url: string, init: RequestInitLike) => Promise<ResponseLike>;

export interface ApiClientOptions {
  /** Prepended to every path. Default ''. */
  baseUrl?: string;
}

/** Rejection value for a response with `ok === false`. */
export interface HttpError extends Error {
  status: number;
}

export type QueryValue = string | number | boolean;

/** Immutable: every method returns a new builder and never changes the one it was called on. */
export interface RequestBuilder<T = unknown> extends PromiseLike<T> {
  query(params: Record<string, QueryValue>): RequestBuilder<T>;
  header(name: string, value: string): RequestBuilder<T>;
  retry(times: number): RequestBuilder<T>;
  /** Follow-up 1 */
  timeout(ms: number): RequestBuilder<T>;
  /** Sends the request and resolves with the parsed JSON body. */
  send(): Promise<T>;
}

export interface ApiClient {
  get<T = unknown>(path: string): RequestBuilder<T>;
  post<T = unknown>(path: string, body: unknown): RequestBuilder<T>;
}

export interface ChainableModule {
  LazyMan(name: string, log: (message: string) => void): ILazyMan;
  createApiClient(fetchImpl: FetchLike, options?: ApiClientOptions): ApiClient;
}
