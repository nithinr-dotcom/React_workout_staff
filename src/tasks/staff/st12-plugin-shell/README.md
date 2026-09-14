# Plugin Architecture / Micro-frontend Shell

## Problem statement
Your product (think Jira, VS Code or Confluence) lets other teams, and eventually third parties, extend the UI without touching the core codebase. Build the **plugin host** and a small **shell** that renders what plugins contribute.

A plugin is an object with an `id`, a `version`, an `engines` range and an `activate(ctx)` function. While it activates, it contributes items to three **extension points**: `toolbar` buttons, `sidebarPanels` (React components) and `commands`. Plugins can be registered eagerly, or lazily as a `load()` function that returns the plugin code (in production, a dynamic `import()`).

The host has to protect the shell from its plugins. A plugin built for the wrong host version must not load. A plugin that throws while activating, or a panel that crashes while rendering, must not take down the shell or other plugins. Deactivating a plugin must leave nothing behind: no contributions, listeners or timers.

`types.ts` is the minimal contract that the tests and Playground depend on. Designing the plugin API is part of the exercise, so extend it where you see fit (and be ready to defend it), but don't break it.

## Clarifying questions to ask
- Are plugins trusted first-party code, or untrusted third-party code? *(Trusted-ish internal teams. They run in the same JS realm, so this is about stability, not security. iframes and Shadow Realms come up in the discussion.)*
- When is compatibility checked: at registration or at activation? *(At activation, because a lazy plugin's `engines` is only known after its code loads.)*
- What does the shell show for a crashed panel? *(A fallback inside that panel's slot. Everything else keeps working.)*
- Can plugins talk to each other directly? *(Only through the event bus on `ctx`, never by importing each other.)*
- Is plugin storage persisted? *(Yes, through an injectable `localStorage`-like store. Each plugin sees only its own keys.)*
- Does order matter for contributions? *(Items appear in the order they were contributed. Priority and ordering are a follow-up.)*

## Functional requirements
- [ ] `createPluginHost({ hostVersion, storage?, onError? })` returns a `PluginHost`.
- [ ] `register(entry)` accepts a `Plugin` or a `LazyPluginEntry`. It never loads or activates anything. Status becomes `registered`. Registering a duplicate id throws.
- [ ] `activate(id)` loads a lazy plugin (status `loading`), checks `engines` against `hostVersion`, then calls `plugin.activate(ctx)` (sync or async). It resolves with the final status and **never rejects**.
  - Incompatible → `incompatible`, and `plugin.activate` is never called.
  - `load()` or `activate()` throws or rejects → `failed`. The error goes to `onError(error, pluginId)`, and any contributions made before the throw are rolled back.
  - Calling `activate` again while loading or active does not load or activate twice. It resolves with the same result.
- [ ] `satisfiesEngine(hostVersion, range)` implements this caret rule: `range` is `^A.B.C`, and the host version `X.Y.Z` is compatible when `X === A` and `(Y, Z) >= (B, C)`, compared as a tuple.
- [ ] `ctx.contribute(point, item)` adds an item and returns a remover. `getContributions(point)` returns the items in contribution order, each with its `pluginId`. The array reference stays stable until that point changes.
- [ ] `ctx.storage` is namespaced per plugin. Two plugins can use the same key without collision. Values are JSON-serialised into the injected storage, so a new host using the same storage sees them. Missing keys return `undefined`.
- [ ] `ctx.events.emit(event, payload)` synchronously calls every handler registered with `ctx.events.on(event, …)` by any active plugin. A handler that throws is reported to `onError` with the **handler owner's** id, and the remaining handlers still run.
- [ ] `deactivate(id)` calls `plugin.deactivate?.()`, runs every `ctx.onDispose` cleanup, removes the plugin's contributions and event handlers, and sets the status to `inactive`. A deactivated plugin can be activated again.
- [ ] `subscribe(listener)` notifies on every status or contribution change.
- [ ] `PluginShell` (default export) renders from the host and updates live as plugins activate and deactivate:
  - a toolbar with one button per toolbar item, rendered even when empty
  - one panel per sidebar panel, each wrapped in its **own** error boundary. A crashed panel shows `This panel crashed.` and reports the error with `host.reportError(error, pluginId)`.
  - a list of commands, one button per command, which calls `run` on click

## Non-functional requirements
- **Accessibility:**
  - The toolbar follows the [APG Toolbar pattern](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/): `role="toolbar"` with `aria-label="Plugin toolbar"`. Roving tabindex is optional in the base version.
  - Each panel is a landmark `region` named by its title (for example `<section aria-labelledby>` pointing at an `<h2>`).
  - Commands are inside `<section aria-label="Commands">`.

  | Key | Behaviour |
  |---|---|
  | `Tab` | Moves into the toolbar, then through panels and commands |
  | `ArrowLeft` / `ArrowRight` | *(Optional)* Move between toolbar buttons |
  | `Enter` / `Space` | Activate the focused button (native) |
- **Performance:**
  - The shell subscribes with `useSyncExternalStore`, so it must not re-render for changes to other extension points. Stable snapshots are what make that possible.
  - Lazy plugins cost nothing until they are activated.
- **Robustness:**
  - No exception from plugin code (activate, deactivate, event handlers, panel render) may escape into the shell.
  - `onDispose` cleanups run even if `plugin.deactivate` throws.
- **UX states:** a status per plugin (`loading`, `failed`, `incompatible`) that the host can show. The Playground demonstrates this.

## Constraints
- 110 minutes. React, TypeScript and CSS Modules only. No plugin or DI libraries.
- No mock API. Sample plugins live in `data.tsx`, and their `load()` functions simulate network latency with `setTimeout`.
- Default-export `PluginShell` from `Solution.tsx`, and export `createPluginHost` and `satisfiesEngine` as named exports.

## Data / API contract
```ts
type ExtensionPoint = 'toolbar' | 'sidebarPanels' | 'commands';
interface ToolbarItem { id: string; label: string; onClick: () => void }
interface SidebarPanel { id: string; title: string; component: ComponentType }
interface Command { id: string; title: string; run: () => void }
interface ContributionMap { toolbar: ToolbarItem; sidebarPanels: SidebarPanel; commands: Command }
type Contribution<P extends ExtensionPoint> = ContributionMap[P] & { pluginId: string };

interface PluginStorage { get<T = unknown>(key: string): T | undefined; set(key: string, value: unknown): void; remove(key: string): void }
interface PluginEventBus { emit(event: string, payload?: unknown): void; on(event: string, handler: (payload: unknown) => void): () => void }

interface PluginContext {
  readonly pluginId: string;
  readonly hostVersion: string;
  contribute<P extends ExtensionPoint>(point: P, item: ContributionMap[P]): () => void;
  readonly storage: PluginStorage;
  readonly events: PluginEventBus;
  onDispose(cleanup: () => void): void;
}

interface Plugin { id: string; version: string; engines: string; activate(ctx: PluginContext): void | Promise<void>; deactivate?(): void }
interface LazyPluginEntry { id: string; load: () => Promise<Plugin | { default: Plugin }> }
type PluginStatus = 'registered' | 'loading' | 'active' | 'inactive' | 'incompatible' | 'failed';

interface KeyValueStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
interface PluginHostOptions { hostVersion: string; storage?: KeyValueStorage; onError?: (error: unknown, pluginId: string) => void }

interface PluginHost {
  readonly hostVersion: string;
  register(entry: Plugin | LazyPluginEntry): void;
  activate(id: string): Promise<PluginStatus>;
  deactivate(id: string): void;
  getStatus(id: string): PluginStatus | undefined;
  getContributions<P extends ExtensionPoint>(point: P): Contribution<P>[];
  subscribe(listener: () => void): () => void;
  reportError(error: unknown, pluginId: string): void;
}

interface PluginShellProps { host: PluginHost }
export default function PluginShell(props: PluginShellProps): JSX.Element;
export function createPluginHost(options: PluginHostOptions): PluginHost;
export function satisfiesEngine(hostVersion: string, range: string): boolean;
```

## Test contract
- The toolbar is `getByRole('toolbar', { name: 'Plugin toolbar' })` and is always rendered. Toolbar items are `button`s named by `label`.
- Each sidebar panel is a `region` whose accessible name is the panel `title`. A crashed panel's region contains the text `This panel crashed.`
- Tests inject `storage` as an in-memory `KeyValueStorage` and pass `onError: vi.fn()`.
- Tests capture `ctx` inside `activate` to call `ctx.storage` and `ctx.events` directly.
- Tests activate plugins inside `act()` while the shell is mounted, then expect the DOM to update.
- `activate` resolves with the exact `PluginStatus` strings above.
- Tests check `satisfiesEngine('1.4.2', …)` against `^1.2.0` (true), `^1.4.2` (true), `^1.4.3` (false), `^1.5.0` (false) and host `2.0.0` against `^1.2.0` (false).

## Edge cases
- A lazy module's plugin `id` differs from the registered id. Treat it as `failed`.
- `deactivate` for a plugin that isn't active is a no-op.
- `deactivate` is called while the plugin is still `loading`. It must not end up active when the load resolves.
- A plugin calls the remover returned by `contribute` twice.
- A plugin calls `ctx.contribute` or `ctx.events.on` after it has been deactivated, for example from a stale `setTimeout`.
- An event handler calls `emit` for the same event, which re-enters the bus. An event handler unsubscribes itself during delivery.
- Corrupt JSON in storage: `get` returns `undefined` instead of throwing.
- The same panel component crashes, and the plugin is then deactivated and re-activated. The boundary must reset.

## Follow-ups
1. **Command palette.** Add `Ctrl/Cmd+K` to open a filterable command palette (APG combobox) over `commands`, with contributions supplying optional `keybinding`s. Detect keybinding conflicts between plugins.
2. **Ordering & `when` clauses.** Contributions take an optional `order` and a `when` expression (for example `"editor.hasSelection"`) evaluated against a host context store. Items only render while their `when` clause is true.
3. **Activation events.** Instead of activating everything at startup, plugins declare `activationEvents` (`onCommand:foo`, `onView:panelId`), and the host activates them on demand. Measure the startup cost you saved.
4. **Dependencies.** Plugins declare `dependencies: ['core-auth']`. Activate dependencies first using topological order. Fail with a clear status on cycles or a missing dependency.
5. **Retry a crashed panel.** The crash fallback gets a `Retry` button that remounts the panel. After 3 crashes within a minute, it disables the plugin and shows a toast.
6. **Isolation levels.** Design (no need to fully build) running an untrusted plugin in a sandboxed iframe that talks to the host over `postMessage`. Which parts of `PluginContext` survive serialisation, and which don't (components, functions)?

## Concepts covered
Registry and extension-point patterns · lazy loading and code splitting · `useSyncExternalStore` with stable snapshots · per-slot error boundaries · disposables and deterministic cleanup · namespaced storage · an event bus with fault isolation · caret semver checks.

Related: ST14 Error Boundary + Observability Layer · ST09 Feature Flag Framework · ST05 Mini Redux (external stores).

## Design discussion prompts
- Why does the plugin get a `ctx` object instead of importing host modules directly? What does that buy you for versioning and for testing?
- Module Federation, import maps, iframes, or web components: how would you choose a delivery mechanism for independently deployed micro-frontends? What does each cost in bundle size, shared React instances and isolation?
- Two plugins bundle different React versions. What breaks, and how do you prevent it (singletons, peer deps, a host-provided runtime)?
- An error boundary doesn't catch errors in event handlers, timers or async code. How do you still attribute those errors to the right plugin?
- How do you evolve the `PluginContext` API without breaking the 200 plugins already written against v1? Think about deprecation windows, adapters and telemetry on API usage.
- A plugin leaks memory by adding a `window` listener and never removing it. How would you detect and prevent that at the platform level?
- What would you measure to decide whether a plugin should load at startup or on demand?
- Who owns a broken plugin in production? Describe the kill switch, the ownership metadata and the alerting.
