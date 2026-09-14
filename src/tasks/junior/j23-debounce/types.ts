export interface DebounceOptions {
  /** Follow-up 1 */
  leading?: boolean;
  /** Follow-up 1 (default true) */
  trailing?: boolean;
  /** Follow-up 2 */
  maxWait?: number;
}

export interface Debounced<Args extends unknown[]> {
  (...args: Args): void;
  cancel(): void;
  flush(): void;
  pending(): boolean;
}

export interface DebounceModule {
  debounce<Args extends unknown[]>(
    fn: (...args: Args) => void,
    wait: number,
    options?: DebounceOptions,
  ): Debounced<Args>;
}
