# Immutable updates: produce() like Immer

## Problem statement
React, Redux and `useSyncExternalStore` all detect changes by reference: `prev !== next`. So state must never be mutated in place. Hand-written immutable updates on nested state look like this:

```ts
return { ...state, users: { ...state.users, [id]: { ...state.users[id], tags: [...state.users[id].tags, tag] } } };
```

Implement `produce(base, recipe)`, the core of Immer, so you can write this instead:

```ts
const next = produce(state, (draft) => {
  draft.users[id].tags.push(tag);
});
```

The recipe gets a **draft**, a `Proxy` that looks and behaves like `base`, and mutates it freely. `produce` returns a new state that reflects those mutations, with two guarantees:

- **Structural sharing.** Every object or array the recipe didn't change is the **same reference** in `next` as in `base`. Only the changed path, from the root down to each change, is copied.
- **No change, no copy.** If the recipe changed nothing, `produce` returns `base` itself.

`base` is never mutated. It may even be deeply frozen.

## Clarifying questions to ask
- Which values get drafts? *(Plain objects (prototype `Object.prototype` or `null`) and arrays. Everything else, such as `Date`, `Map`, class instances and functions, is treated as an opaque value: it can be replaced, but its insides aren't tracked. Map and Set are follow-up 2.)*
- Does assigning the same value count as a change? *(No. `draft.count = draft.count` changes nothing, as judged by `Object.is`.)*
- Can the recipe return a value? *(Yes. If it returns anything other than `undefined` or the draft itself, that value is the result. Returning a new value **and** modifying the draft is a bug, and `produce` throws.)*
- What if the recipe keeps a reference to the draft and uses it later? *(After `produce` returns, the draft is dead. Using it may throw, but it must never change `base` or the returned state.)*
- Can drafts end up inside new objects? *(Yes, and it's common: `draft.todos = draft.todos.filter((t) => !t.done)` builds a plain array whose elements are child drafts. The result must contain only real values, never proxies.)*
- Are getters, symbols and non-enumerable properties handled? *(Out of scope. Own enumerable string keys are enough.)*
- Is the result frozen, as Immer does? *(Not in the base version. That's follow-up 1.)*

## Functional requirements
- [ ] `produce(base, recipe)` calls `recipe` synchronously, once, with a draft of `base`, and returns the next state.
- [ ] Reading from the draft returns current values, including changes made earlier in the same recipe, at any depth. That covers `length`, `in`, `Object.keys`, iteration and array methods.
- [ ] Writes supported on nested objects: assigning a property, adding a new property, and `delete`.
- [ ] Writes supported on nested arrays: index assignment, `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse` and setting `length`.
- [ ] **`base` is never mutated**, and a deeply frozen `base` works.
- [ ] **Structural sharing:** in the result, every object or array along a changed path is a new copy, and every untouched subtree is `===` the one in `base`.
- [ ] If nothing changed, the result is `base` itself (`===`). Reading, and assigning identical values, are not changes.
- [ ] If the recipe returns a value that is neither `undefined` nor the draft, and didn't modify the draft, that value is the result.
- [ ] If it returns such a value **and** modified the draft, `produce` throws an `Error`.
- [ ] The result contains **no proxies** anywhere. That includes drafts moved elsewhere in the tree, e.g. `draft.selected = draft.items[1]`, and drafts inside newly created objects or arrays.
- [ ] A draft moved elsewhere but never modified is finalized to the original reference: `next.selected === base.items[1]`.
- [ ] Using a draft after `produce` returns doesn't affect `base` or the result, whether it throws or is silently ignored.
- [ ] A primitive `base` is supported: the recipe can only return a replacement, e.g. `produce(1, () => 2) === 2`.

## Non-functional requirements
- **Lazy:** don't clone `base` up front. Create a child draft only when a property is read, and copy an object only when it's first written (copy-on-write).
- **Cost:** a single change deep in a large state is O(depth × width of each copied node), not O(size of state).
- **No leaks:** drafts are revoked or disabled after `produce` returns (`Proxy.revocable`).
- **Types:** `produce<T>` keeps `T`. The draft is typed as `T`; a `Draft<T>` that removes `readonly` is a nice extra.

## Constraints
- 75 minutes. TypeScript only. No Immer, no `structuredClone`/JSON deep copies of the whole state.
- Export `produce` from `Solution.ts`. The follow-up exports are `produceWithPatches` and `applyPatches`. The types are in `types.ts`.
- No mock API needed.

## Data / API contract
```ts
type Recipe<T> = (draft: T) => T | void | undefined;

function produce<T>(base: T, recipe: Recipe<T>, options?: { autoFreeze?: boolean }): T;

// Follow-up 3
interface Patch { op: 'replace' | 'add' | 'remove'; path: (string | number)[]; value?: unknown }
function produceWithPatches<T>(base: T, recipe: Recipe<T>): [T, Patch[], Patch[]];
function applyPatches<T>(base: T, patches: Patch[]): T;
```

## Test contract
- Tests import `produce` (and `produceWithPatches` / `applyPatches` for follow-up 3) as named exports.
- `base` objects in most tests are **deeply frozen** before `produce` is called. Tests also compare against a `JSON.stringify` snapshot of `base` taken beforehand.
- Structural sharing is checked with `toBe` (same reference) and `not.toBe` (new copy). Values are checked with `toEqual`.
- "No proxies" is checked by calling `structuredClone(result)`, which throws on any `Proxy`, revoked or not. Test states therefore contain only plain objects, arrays and primitives.
- The leaked-draft test wraps writes to the old draft in `try/catch`, so throwing is allowed.
- Follow-up 1 checks `Object.isFrozen` on new nodes in the result and that frozen results still share untouched subtrees.
- Follow-up 3 checks that `applyPatches(base, patches)` deep-equals `next`, and that `applyPatches(next, inversePatches)` deep-equals `base`. It doesn't check the exact patch list.

## Edge cases
- Reading `draft.a.b.c` without writing: no copies, and the result is `base`.
- Writing a value then writing the original back (`draft.x = 1; draft.x = 0`). Immer still counts this as modified. Your call, but explain.
- `draft.list = draft.list.filter(...)`: a new array containing child drafts, some modified.
- The same child accessed twice returns the same draft (`draft.a === draft.a`), so edits through either alias are kept.
- `delete draft.missing`, a delete of a key that doesn't exist, isn't a change.
- Sparse arrays and `length` assignments that shrink an array.
- A deeply frozen `base`. Read up on Proxy *invariants* before you pick your proxy's target.
- The recipe throws: the error propagates, `base` is untouched, and the drafts are revoked.
- The recipe returns `undefined` but you really want to replace the state with `undefined`. Immer has a `nothing` token for this; discuss.

## Follow-ups
1. **Auto-freeze.** With `{ autoFreeze: true }`, deep-freeze every object and array the result **newly contains**, so accidental mutation throws in development. Don't walk into subtrees shared with `base`: they're already immutable by contract, and walking them would make every update O(size of state). Why does Immer freeze by default in dev?
2. **Map and Set.** Support drafts of `Map` and `Set` (`draft.users.get(id).name = 'x'`, `draft.tags.add('new')`). A `Proxy` with `get`/`set` traps isn't enough on its own. Why?
3. **Patches for undo/redo.** Implement `produceWithPatches(base, recipe)`, which returns `[next, patches, inversePatches]`, and `applyPatches(state, patches)`. Record patches from the draft tree when you finalize. Apply `inversePatches` to undo. How is this cheaper than storing whole snapshots, and when isn't it?
4. **`useImmerReducer`.** Write `useImmerReducer(reducer, initialState)`, where the reducer mutates a draft. Which React bailout do you get for free when a recipe changes nothing, and why does a naive deep clone lose it?
5. **Curried producers.** Support `produce(recipe)` returning `(base, ...args) => next`, so `setState(produce((d) => { d.done = true }))` works. How do you type the overloads?

## Concepts covered
`Proxy.revocable` with `get` / `set` / `deleteProperty` / `has` / `ownKeys` traps · copy-on-write with a per-draft `modified` flag and a lazily created `copy` · propagating "modified" up to parents · finalizing a draft tree back to plain values · reference equality as a cheap change signal · the rules for recipes that return a value.

Related: S29 deepClone & deepEqual · ST05 Mini Redux · S20 Undo/Redo Drawing Canvas · J41 Undoable Counter · S48 In-memory file system.
