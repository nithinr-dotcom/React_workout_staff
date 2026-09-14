# listFormat, once, shuffle & expiring storage

## Problem statement
Four short utilities that come up as warm-ups or as the "second question" in a JavaScript round. Each one is only a few lines, but has one detail that separates a pass from a strong pass:

| Function | Example | The detail |
|---|---|---|
| `listFormat(items, options?)` | `['Bob', 'Ben', 'Tim']` → `'Bob, Ben and Tim'` | Grammar for 0/1/2/many items, and "and 1 other" vs "and 2 others". It's in GreatFrontEnd's top 75. |
| `once(fn)` / `onlyTwice(fn)` | `onlyTwice(fn)` → 1st, 2nd, 1st, 2nd… results | Closure state and `this`. Dream11 asked `onlyTwice`. |
| `shuffle(arr, random?)` | `[1, 2, 3]` → `[3, 1, 2]` | Every permutation must be **equally likely**. Most quick answers are biased. BFE.dev #8. |
| `createExpiringStorage(storage?, now?)` | `setItem('otp', '1234', 60_000)` | `localStorage` with a TTL, expired keys read as `null` and are cleaned up. GreatFrontEnd and BFE.dev #135. |

Implement them as named exports from `Solution.ts`.

## Clarifying questions to ask
- For `listFormat`, is there an Oxford comma? *(No: `'a, b and c'`.)*
- What about empty strings in the list? *(They are ignored.)*
- If `unique`, `sorted` and `length` are all set, in which order are they applied? *(Remove empty strings, then duplicates, then sort, then truncate to `length`.)*
- What if `length` is `0`, negative, or not smaller than the number of items? *(It is ignored, and every item is listed.)*
- What does `once` return on later calls? *(The first call's result, even if it was `undefined`. Later arguments are ignored.)*
- If `fn` throws on the first call of `once`, is it "used up"? *(Not tested. Explain which behaviour you chose.)*
- Should `shuffle` mutate the array? *(No. Return a new array.)*
- Why does `shuffle` take `random`? *(So tests are deterministic. Always use it instead of `Math.random` directly.)*
- What can be stored in the expiring storage? *(Any JSON-serialisable value. `getItem` returns it parsed.)*
- Is the TTL boundary inclusive? *(Your choice, not tested. `ttlMs` of `0` or less means already expired.)*
- What if `setItem` is called without a TTL? *(The entry never expires.)*
- The storage may already contain keys that your wrapper didn't write. *(`getItem` on such a key must not throw. Returning `null` is fine.)*

## Functional requirements
### listFormat
- [ ] `[]` → `''`, `['a']` → `'a'`, `['a', 'b']` → `'a and b'`, `['a', 'b', 'c']` → `'a, b and c'`.
- [ ] Empty strings are ignored.
- [ ] `unique: true` removes duplicates, keeping the first occurrence.
- [ ] `sorted: true` sorts the items with the default string sort.
- [ ] `length: n` (a positive integer smaller than the item count) lists the first `n` items, then `and 1 other` or `and K others`. For example `'a, b and 1 other'` and `'a and 2 others'`.
- [ ] Doesn't mutate the input array.

### once / onlyTwice
- [ ] `once(fn)` returns a function that calls `fn` on its first call only, forwarding the arguments and `this`. Every call returns the first call's result.
- [ ] `onlyTwice(fn)` calls `fn` on its first two calls only. From then on, odd-numbered calls (1st, 3rd, 5th…) return the 1st call's result and even-numbered calls return the 2nd call's result.
- [ ] Each wrapper has its own state.

### shuffle
- [ ] Returns a **new** array containing exactly the same items, in a random order. The input is not mutated.
- [ ] Uses the `random` argument (default `Math.random`) as its only source of randomness.
- [ ] Every permutation is equally likely, given a uniform `random`.
- [ ] Works for `random()` values anywhere in `[0, 1)`, including `0` and values just below `1`.
- [ ] `[]` and single-item arrays work.

### createExpiringStorage
- [ ] Wraps `storage` (default `localStorage`) and uses `now()` (default `Date.now`) as the clock.
- [ ] `setItem(key, value, ttlMs?)` stores `value`. With `ttlMs`, the entry expires `ttlMs` ms after the call. Without it, the entry never expires. Setting a key again replaces the value and the expiry.
- [ ] `getItem(key)` returns the stored value, or `null` if the key is missing or expired.
- [ ] Reading an expired entry **removes** it from the underlying storage.
- [ ] `removeItem(key)` deletes the entry.
- [ ] Values survive a new wrapper over the same storage, so a page reload keeps them.

## Non-functional requirements
- `shuffle` runs in O(n) time. Sorting with a random comparator is not accepted: it's biased and O(n log n).
- `listFormat` is O(n log n) at most.
- The expiring storage keeps all of its state in `storage`, not in memory, so several wrappers and reloads agree.
- Typed as in `types.ts`.

## Constraints
- 40 minutes for all four.
- No libraries, and no `Intl.ListFormat`.
- Export every function from `Solution.ts`.

## Data / API contract
```ts
interface ListFormatOptions { length?: number; unique?: boolean; sorted?: boolean }
type AnyFn = (this: any, ...args: any[]) => any;
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
interface ExpiringStorage {
  setItem(key: string, value: unknown, ttlMs?: number): void;
  getItem<T = unknown>(key: string): T | null;
  removeItem(key: string): void;
}

function listFormat(items: readonly string[], options?: ListFormatOptions): string;
function once<F extends AnyFn>(fn: F): (...args: Parameters<F>) => ReturnType<F>;
function onlyTwice<F extends AnyFn>(fn: F): (...args: Parameters<F>) => ReturnType<F>;
function onlyN<F extends AnyFn>(fn: F, n: number): (...args: Parameters<F>) => ReturnType<F>; // follow-up 3
function shuffle<T>(arr: readonly T[], random?: () => number): T[];
function createExpiringStorage(storage?: StorageLike, now?: () => number): ExpiringStorage;
```

## Test contract
- The functions are imported as named exports.
- `shuffle` tests inject a seeded pseudo-random generator and check the output is a permutation, that `Math.random` is never called, and that over tens of thousands of shuffles of `[1, 2, 3]` each of the 6 orders appears within ±5% of the expected count. They also inject constant `random` functions returning `0` and `0.9999999`.
- Expiring storage tests pass an in-memory `StorageLike` backed by a `Map` and a controllable `now()`. They only use your wrapper's API, plus the in-memory store's **size** to check that expired entries were removed. Your key format is up to you.
- One test uses the defaults: real `localStorage` (cleared between tests) with `vi.useFakeTimers()`, which also fakes `Date.now`.
- Follow-up tests (`npm run test:followups -- j31`) check `onlyN`.

## Edge cases
- `listFormat(['a', 'a', 'b'], { unique: true, length: 1 })` → `'a and 1 other'`: truncation counts unique items.
- `listFormat(['', ''])` → `''`.
- `once` where the first call returns `undefined`: later calls must still not call `fn`.
- `onlyTwice` called only once, then a 3rd time never happens: the 1st result is returned.
- `shuffle` with duplicate items: `[1, 1, 2]` still returns two `1`s and one `2`.
- An expiring value of `null`, `0`, `false` or `''`. `null` is ambiguous with "missing"; what would you do about it?
- `storage.setItem` throwing `QuotaExceededError`.

## Follow-ups
1. **i18n.** Replace your hand-rolled joiner with `Intl.ListFormat`, and explain what changes for `'de'` or `'ja'`. How would you translate "and 2 others" with correct plurals (`Intl.PluralRules`)?
2. **Testing randomness.** How did the test prove that `shuffle` is unbiased? Show why `arr.sort(() => random() - 0.5)` and "swap every index with any random index" are biased for `[1, 2, 3]`. Hint: count the equally likely execution paths.
3. **onlyN.** Generalise `onlyTwice` to `onlyN(fn, n)`: `fn` runs on the first `n` calls, and call `k` returns the result of call `((k - 1) % n) + 1`.
4. **Sweeping.** Expired entries that are never read stay in storage forever. Add `clearExpired()` that removes every expired entry your wrapper owns. How do you find "your" keys without touching other code's keys?
5. **Cross-tab and clocks.** Two tabs share the same storage. What happens if their clocks disagree, or the user changes the system time? Would storing an absolute expiry or a relative TTL be safer?

## Concepts covered
Closures holding call state · `this` forwarding · Fisher–Yates and why naive shuffles are biased · dependency injection of `random` and `now` for testability · `localStorage` serialisation · lazy expiry vs sweeping.

Related: J23 debounce · J25 Hooks pack (useLocalStorage) · J09 Theme Toggle · S31 memoize & LRU cache.
