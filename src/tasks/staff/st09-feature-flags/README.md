# Feature Flag Framework

## Problem statement
Your company ships every change behind a feature flag. Product teams want to target flags by user attributes, roll features out to a stable percentage of users, and flip a kill switch that reaches open tabs within seconds. Today each team reads flags differently, so pages flicker from the old UI to the new one, and experiment exposure data is full of duplicates.

Build the frontend flag SDK that every team will adopt. It has three layers:

1. **A pure evaluation engine.** `evaluateFlag(flag, user)` and `getBucket(flagKey, userId)`. No React and no I/O.
2. **A framework-agnostic client.** `createFlagClient(options)` holds the current snapshot of evaluated values. It starts from bootstrap values, fetches definitions for a user, and applies live pushes.
3. **React bindings.** `<FlagProvider>`, `useFlag(key, default)` and `<Feature flag fallback>`. They must never flicker and must log each exposure once.

The API design is part of the exercise. `types.ts` is the **minimal contract** that the tests and Playground depend on. Extend it wherever you think the API should be better, but don't break it.

## Clarifying questions to ask
- Are flags evaluated on the server or on the client? *(On the client. The service returns rule definitions and the SDK evaluates them. Bootstrap values are already evaluated, for the first render.)*
- What happens when a user matches a rule's conditions but falls outside its percentage? *(That rule doesn't apply. Evaluation continues with the next rule.)*
- How do anonymous users (no `id`) interact with percentage rules? *(They are never inside a percentage rollout. Rules without `percentage` still apply to them.)*
- Should increasing a rollout from 10% to 20% keep everyone who was in the first 10%? *(Yes. Rollouts must be monotonic.)*
- Should the same user land in the same bucket for every flag? *(No. Buckets must be independent per flag, so the same 10% of users aren't always the guinea pigs.)*
- What counts as an "exposure"? *(A component reading a flag value that exists in the snapshot. Log it once per provider for each flag key + value pair.)*
- What if the user changes (login/logout) mid-session? *(Re-identify. A response for the previous user must never overwrite the current user's values.)*

## Functional requirements
**Evaluation engine**
- [ ] `evaluateFlag` returns `defaultValue` when `enabled === false`, ignoring the rules.
- [ ] Rules are checked in order, and the first rule that *applies* wins. A rule applies when all of its `conditions` match and, if it has a `percentage`, when `getBucket(flag.key, user.id) < percentage`.
- [ ] Condition `eq` matches when `user.attributes[attribute] === value`. Condition `in` matches when the attribute is one of `values`. A missing attribute never matches.
- [ ] A user without an `id` never applies to a percentage rule.
- [ ] When no rule applies, return `defaultValue`.
- [ ] `getBucket(flagKey, userId)` returns an integer from 0 to 99. It is deterministic across calls, page loads and devices, and roughly uniform across users.

**Client**
- [ ] `getSnapshot()` returns the `bootstrap` values (or `{}`) synchronously, before any fetch.
- [ ] `getSnapshot()` returns the *same object* until the values change.
- [ ] `identify(user)` calls `fetchFlags(user, { signal })`, evaluates every definition for that user, replaces the snapshot with exactly those values, notifies subscribers, and then resolves.
- [ ] If `connect` is given, the client connects to it. Each `push(definitions)` synchronously re-evaluates for the current user, updates the snapshot and notifies subscribers.
- [ ] Calling `identify` again aborts the in-flight fetch, and a stale response never wins.
- [ ] `destroy()` disconnects the stream and aborts in-flight work.

**React bindings**
- [ ] `<FlagProvider client user onExposure>` reads the client's snapshot and calls `client.identify(user)` on mount and whenever `user.id` changes.
- [ ] The **first render** already uses whatever `client.getSnapshot()` returns (bootstrap). There is no default-then-real flicker.
- [ ] `useFlag(key, defaultValue)` returns the snapshot value, or `defaultValue` when the key is missing. Components re-render when the value changes.
- [ ] `<Feature flag="x">` renders `children` when the flag is `true`, and `fallback` (or nothing) otherwise. With `value="b"`, it renders `children` when the flag equals `"b"`.
- [ ] `onExposure({ flagKey, value, userId })` fires the first time a component reads a flag that exists in the snapshot. It is **deduped per provider by flag key + value**: re-renders, remounts and several readers of the same flag don't log again. It never fires during render.

## Non-functional requirements
- **No flicker:** gated UI must never flash the wrong variant on first paint when bootstrap values exist. Be ready to explain how this works with SSR hydration.
- **Performance:** a flag change re-renders only components that read flags, not the whole tree. Evaluation is O(rules × conditions) with no allocation-heavy work in render.
- **Resilience:** if `fetchFlags` rejects, keep the last good snapshot (bootstrap or previous). Flags must never throw into product code.
- **Type safety:** `useFlag('x', false)` is typed `boolean`, and `useFlag('x', 'control')` is typed `string`. If the stored value's type differs from the default's type, return the default and warn in development.
- **Accessibility:** swapping variants must not move focus or remount unrelated subtrees. Don't key the whole app on flag values.
- **Developer experience:** in development, warn once when `useFlag` is used outside a provider or reads a flag that doesn't exist.

## Constraints
- 105 minutes. React only, with no flag or state libraries.
- `useSyncExternalStore` is allowed and encouraged.
- The Playground uses the fake flag service in `data.ts` (`mockFetchFlags`, `mockConnect`, `publishDefinitions`). Tests inject their own fakes.
- Keep `types.ts` compatible. Add to it freely.

## Data / API contract
```ts
type FlagValue = boolean | string | number;
type AttributeValue = string | number | boolean;
interface FlagUser { id?: string; attributes?: Record<string, AttributeValue> }

type Condition =
  | { attribute: string; op: 'eq'; value: AttributeValue }
  | { attribute: string; op: 'in'; values: AttributeValue[] };

interface TargetingRule { conditions?: Condition[]; percentage?: number; value: FlagValue }
interface FlagDefinition { key: string; enabled?: boolean; rules: TargetingRule[]; defaultValue: FlagValue }

type FlagSnapshot = Readonly<Record<string, FlagValue>>;

interface FlagClient {
  getSnapshot(): FlagSnapshot;
  subscribe(listener: () => void): () => void;
  identify(user: FlagUser): Promise<void>;
}

interface CreateFlagClientOptions {
  bootstrap?: FlagSnapshot;
  fetchFlags(user: FlagUser, options: { signal: AbortSignal }): Promise<FlagDefinition[]>;
  connect?(push: (definitions: FlagDefinition[]) => void): () => void;
}

interface ExposureEvent { flagKey: string; value: FlagValue; userId?: string }
interface FlagProviderProps { client: FlagClient; user: FlagUser; onExposure?: (e: ExposureEvent) => void; children: ReactNode }
interface FeatureProps { flag: string; value?: FlagValue; fallback?: ReactNode; children: ReactNode }

// Named exports from Solution.tsx
function evaluateFlag(flag: FlagDefinition, user: FlagUser): FlagValue;
function getBucket(flagKey: string, userId: string): number;          // integer 0–99
function createFlagClient(options: CreateFlagClientOptions): FlagClient & { destroy(): void };
function FlagProvider(props: FlagProviderProps): JSX.Element;
function useFlag(key: string, defaultValue: boolean): boolean;          // + string / number overloads
function Feature(props: FeatureProps): JSX.Element | null;
```

## Test contract
- Everything is imported as **named exports** from `Solution.tsx`.
- Distribution: over the ids `user-0` … `user-9999`, a `percentage: 30` rule applies to more than 25% and fewer than 35% of users.
- For any user with an id, a percentage rule applies exactly when `getBucket(flag.key, user.id) < percentage`.
- Provider tests use a **fake `FlagClient`** (a plain object with `getSnapshot`, `subscribe`, `identify`). They check that:
  - the very first rendered value comes from `getSnapshot()`;
  - `identify` is called with the `user` prop;
  - notifying subscribers after changing the snapshot updates the UI.
- `<Feature>` is checked by the visible text of its `children` and `fallback`.
- `onExposure` is checked with `toHaveBeenCalledTimes(1)` after re-renders and with two readers of the same flag.
- Client tests pass `fetchFlags` and `connect` as `vi.fn`s, `await client.identify(user)`, then compare `getSnapshot()` with `toEqual`.

## Edge cases
- `percentage: 0` never applies and `percentage: 100` always applies (for users with an id).
- A rule with no conditions and no percentage applies to everyone. Any rules after it are unreachable.
- `identify(userA)` then `identify(userB)` quickly, with A's response arriving last.
- `fetchFlags` rejects or the network is offline: keep the last good snapshot.
- A live push arrives before the first `identify` resolves.
- A flag in bootstrap but not in the fetched definitions (it was deleted server-side).
- The `FlagProvider` `user` prop is a new object with the same `id` on every parent render. Don't re-fetch.
- The same flag is read by components mounted at different times. Log the exposure once.

## Follow-ups
1. **Evaluation reasons.** Add `evaluateFlagDetail(flag, user)` → `{ value, reason: 'OFF' | 'RULE_MATCH' | 'FALLTHROUGH', ruleIndex? }` and include the reason in exposure events. Explain why experiment analysis needs it.
2. **Local overrides.** Let QA force values via `?flags=new-checkout:true` or a dev-tools panel, persisted in `sessionStorage`. Overrides win over everything and are never logged as exposures.
3. **Batched exposure transport.** Replace the `onExposure` callback with a transport that batches events, flushes on `pagehide` with `navigator.sendBeacon`, and dedupes across reloads within one session.
4. **Mutually exclusive experiments.** Two experiments must never both include the same user. Design layered bucketing (salt per layer, ranges per experiment) without breaking existing buckets.
5. **SSR.** The server evaluates the same definitions and inlines the snapshot. Show how you guarantee the server and client hash identically, and what happens when definitions change between server render and hydration.

## Concepts covered
Pure evaluation engines · deterministic hashing (FNV / murmur) and monotonic rollouts · `useSyncExternalStore` with a stable snapshot · bootstrap vs async hydration · live subscriptions · effect-based side-effect logging with dedupe · SDK API layering (core / client / bindings) · abort and race handling.

Related: ST05 Mini Redux (external stores) · ST06 Mini React Query (async cache) · ST14 Observability layer (event transport) · ST12 Plugin shell.

## Design discussion prompts
- Walk through your hash function. How did you check the distribution, and why must the flag key be part of the hashed input?
- Why `useSyncExternalStore` instead of `useState` + `useEffect` in the provider? What breaks under concurrent rendering otherwise?
- Client-side evaluation leaks your targeting rules (e.g. `email in [...]`) to the browser. When would you move evaluation server-side, and what does that do to the API?
- A kill switch must reach 100% of open tabs within 5 seconds. Compare SSE, WebSocket and polling, and describe what happens when the stream is down.
- How do you stop flag checks from piling up as permanent tech debt? Think about lifecycle, ownership metadata, stale-flag lint rules and removal.
- Exposure logging: why log in an effect rather than during render? How do you avoid under-counting when a user sees the variant but the component unmounts quickly?
- How would you roll this SDK out to 40 teams who currently read flags from a global `window.FLAGS` object?
- A flag that toggles mid-session unmounts a form the user is typing in. Whose responsibility is that, and what API would prevent it?
