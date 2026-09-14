# Transactional KV store

## Problem statement
Build an in-memory key-value store that supports **nested transactions**. This is a classic "simple database" pair-programming exercise. The interviewer cares less about code volume and more about data-structure choices and complexity.

`createStore()` returns an object with these operations:

| Operation | Meaning |
|---|---|
| `get(key)` | The visible value, or `null` |
| `set(key, value)` | Set a value |
| `delete(key)` | Remove a key. Returns whether it was set |
| `count(value)` | How many keys currently hold exactly `value` |
| `begin()` | Open a transaction. Transactions can be nested |
| `commit()` | Merge the **innermost** transaction's changes into its parent (or into the base store if it is the outermost) |
| `rollback()` | Discard every change made in the **innermost** transaction |
| `depth()` | Number of open transactions |

Calling `commit()` or `rollback()` with no open transaction throws an `Error` with the message `NO TRANSACTION`.

Example:
```
set a 10        get a → 10
begin
  set a 20      get a → 20
  begin
    delete a    get a → null   count 10 → 0
  rollback      get a → 20
commit          get a → 20     depth → 0
rollback        ✗ throws "NO TRANSACTION"
```

## Clarifying questions to ask
- What types are keys and values? *(Both are strings. Generic values are a follow-up.)*
- Does `commit()` close only the innermost transaction or all of them? *(Only the innermost. Its changes become part of the parent, so a later parent `rollback()` undoes them too.)*
- What happens when `commit()` / `rollback()` is called with nothing open? *(Throw `new Error('NO TRANSACTION')` and leave the store unchanged.)*
- Does `count` count keys or occurrences? *(Keys whose current visible value equals `value` exactly.)*
- What are the performance expectations? *(See the non-functional requirements. Say your complexities out loud.)*
- Is thread-safety or persistence needed? *(No. Single-threaded JS, in memory only.)*

## Functional requirements
- [ ] `get` returns the most recently set visible value for a key, or `null` if it was never set or was deleted.
- [ ] `set` overwrites. Setting the same value again is allowed and doesn't change `count`.
- [ ] `delete` returns `true` if the key was set (and removes it), otherwise `false`.
- [ ] `count(value)` reflects the visible state, including uncommitted changes in open transactions.
- [ ] `begin()` can be called any number of times. Each call opens a transaction nested inside the current one.
- [ ] `rollback()` restores `get` and `count` exactly to how they were when the innermost `begin()` was called, and decrements `depth()`.
- [ ] `commit()` keeps the visible state unchanged and decrements `depth()`. Afterwards, rolling back the parent also undoes the committed changes.
- [ ] Committing the outermost transaction makes the changes permanent.
- [ ] `commit()` / `rollback()` with no open transaction throw `Error('NO TRANSACTION')` and change nothing.
- [ ] Stores created by separate `createStore()` calls are independent.

## Non-functional requirements
- **Complexity targets** (be ready to justify them):
  - `get`, `set`, `delete`, `count`: O(1). Do **not** scan all keys or all transaction layers to answer them.
  - `rollback`: O(k), where k is the number of keys changed in the innermost transaction. Not O(store size).
  - `commit`: O(k) for the innermost transaction.
  - `begin`: O(1).
- **Memory:** a transaction should cost memory proportional to what it changes, not to the size of the store.
- **Error semantics:** throwing on a missing transaction must not corrupt internal state.

## Constraints
- 50 minutes. Plain TypeScript. Use `Map` / `Set`, no libraries.
- Export `createStore` (and `execute` for follow-up 1) from `Solution.ts`. The types are in `types.ts`.
- No mock API needed.

## Data / API contract
```ts
interface TransactionalStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  delete(key: string): boolean;
  count(value: string): number;
  begin(): void;
  commit(): void;   // throws Error('NO TRANSACTION') when depth() === 0
  rollback(): void; // throws Error('NO TRANSACTION') when depth() === 0
  depth(): number;
}

function createStore(): TransactionalStore;

// Follow-up 1
function execute(store: TransactionalStore, line: string): string | null;
```

## Test contract
- Tests import `createStore` as a named export and interact only through the methods above.
- Errors are checked with `expect(() => store.rollback()).toThrow('NO TRANSACTION')`.
- `get` of a missing key must be exactly `null`, not `undefined`.
- Follow-up 1 tests call `execute(store, line)` with the commands `SET k v`, `GET k`, `DELETE k`, `COUNT v`, `BEGIN`, `COMMIT` and `ROLLBACK`. They expect `GET` to return the value or `NULL`, `COUNT` to return the number as a string, `DELETE` to return `null`, `ROLLBACK`/`COMMIT` with nothing open to return `NO TRANSACTION`, and every other command to return `null`.

## Edge cases
- Setting a key in a transaction and deleting it again in the same transaction, then rolling back. The original value must come back.
- The same key changed in several nested levels, then a mix of commits and rollbacks.
- A key that didn't exist before the transaction is created and then rolled back: `get` → `null`, and `count` goes back down.
- `delete` of a key that is already missing inside a transaction, then rollback.
- `count` for a value held by multiple keys, across set, overwrite and delete.
- Very deep nesting (1,000 `begin()` calls) with a single change at the innermost level.

## Follow-ups
1. **Command interpreter.** Implement `execute(store, line)` for the text protocol in the test contract (`SET a 10`, `GET a` → `10` or `NULL`, `COUNT 10` → `1`, `ROLLBACK` with nothing open → `NO TRANSACTION`). Keep parsing separate from the store logic.
2. **Commit all.** Change `commit()` so it permanently applies **every** open transaction at once, as in the original Thumbtack variant. Which design (undo log vs. layered maps) makes this cheaper?
3. **Snapshots.** Add `snapshot()`, which returns a read-only view that doesn't change as later writes happen. Discuss persistent data structures versus copy-on-write.
4. **Generic values.** Support any JSON-serializable value, with `count` using structural equality. What happens to O(1) `count`?
5. **React binding.** Expose the store through `useSyncExternalStore`, so components re-render only when a key they read changes.

## Concepts covered
Choosing between an undo log and layered overlays · keeping a reverse index (`value → count`) consistent through rollbacks · amortized complexity · sentinel values for "deleted" · designing error semantics.

Related: S20 Undo/Redo canvas · S31 memoize & LRU · S28 Event emitter.
