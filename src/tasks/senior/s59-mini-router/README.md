# Mini client-side router

## Problem statement
Build a small client-side router for React from scratch, without `react-router` or any other routing library. Build it on top of the browser History API:

```tsx
<Router>
  <nav>
    <Link to="/">Home</Link>
    <Link to="/users/42">User 42</Link>
  </nav>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/users/:id" element={<UserPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
</Router>

function UserPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  return <button onClick={() => navigate('/', { replace: true })}>Back home from {id}</button>;
}
```

Clicking a `Link` changes the URL **without a page load** and renders the matching route. The browser's back and forward buttons work. Cmd/Ctrl-clicking a link still opens it in a new tab, as a real link should.

"Implement React Router" comes up in senior write-ups as a way to test whether you understand the History API and React context, rather than just using a library. BFE #59, "create a browser history", covers the same history-stack idea.

## Clarifying questions to ask
- Which part of the URL is matched? *(Only `location.pathname`. The query string and hash are ignored for matching.)*
- How are dynamic segments written, and what can they match? *(`:name` matches exactly one non-empty segment. Its value is `decodeURIComponent`-decoded.)*
- Exact or prefix matching? *(Exact, after ignoring one trailing slash: `/users/42/` matches `/users/:id`, but `/users/42/posts` doesn't. Matching is case-sensitive.)*
- If several routes match, which wins? *(The first matching route in declaration order. Ranking is follow-up 2.)*
- What does `*` do? *(It's the fallback. It renders only when no other route matches, wherever it's declared.)*
- No match and no `*`? *(`<Routes>` renders nothing.)*
- Are nested `<Routes>` or `<Outlet>` needed? *(No. That's follow-up 1.)*
- Does `navigate` accept relative paths or numbers like `navigate(-1)`? *(No. Only absolute paths starting with `/`. Users have the browser back button.)*
- Is `<Route>` a real component? *(It's a configuration element. `<Routes>` reads its props. Rendered on its own, it renders nothing.)*

## Functional requirements
- [ ] `<Router>` reads the current location from `window.location` when it mounts and re-renders its subtree when the location changes.
- [ ] `<Router>` listens for `popstate`, which fires on back/forward, and removes the listener on unmount.
- [ ] `<Routes>` looks at its direct `<Route>` children and renders the `element` of the first route whose `path` matches the current pathname. If none matches, it renders the `*` route's element, or nothing.
- [ ] Static segments must match exactly. Each `:param` segment matches one non-empty segment. One trailing slash in the URL is ignored.
- [ ] `useParams()` returns the matched route's params as strings, URI-decoded (`/users/ada%20l` → `{ id: 'ada l' }`). It returns `{}` for static routes and the fallback.
- [ ] `useNavigate()` returns a stable function `navigate(to, { replace })`. It calls `history.pushState`, or `history.replaceState` when `replace` is set, and re-renders the routes.
- [ ] `<Link to>` renders a real `<a href={to}>` that passes other anchor props (`className`, `aria-*`, `target`, …) through.
- [ ] Clicking a `Link` calls its `onClick` prop first. Then, only for a plain left click, it calls `preventDefault()` and navigates. `replace` on the Link uses `replaceState`.
- [ ] A "plain left click" means: `button === 0`, no `metaKey`/`ctrlKey`/`shiftKey`/`altKey`, not already `defaultPrevented`, and no `target` other than `_self`.
- [ ] Back/forward (a `popstate` event) re-renders with whatever `window.location` now says.
- [ ] Nothing is imported from `react-router`.

## Non-functional requirements
- **Accessibility:** links are real anchors, so they get keyboard activation, the context menu, "copy link address" and middle-click for free. Don't render buttons or `div`s with click handlers.
- **Focus management** after navigation is worth discussing, e.g. moving focus to the new page's `<h1>`, but it isn't required.
- **Performance:** `navigate` has a stable identity, so it's safe in effect dependency arrays. Changing location re-renders the `<Router>` subtree once per navigation.
- **Robustness:**
  - Two `<Router>`s must not share module-level state.
  - The `popstate` listener is removed on unmount (StrictMode mounts twice in dev).
  - Using a hook outside `<Router>` throws a clear error.

## Constraints
- 75 minutes. React 19 only. **No `react-router` imports.** The app shell uses it, but your task must not.
- Export `Router`, `Routes`, `Route`, `Link`, `useParams`, `useNavigate` (and `useSearchParams` for follow-up 3) as named exports from `Solution.tsx`. Keep `types.ts` unchanged.
- No mock API needed.

## Data / API contract
```ts
interface RouterProps { children?: ReactNode }
interface RoutesProps { children?: ReactNode }                 // <Route> elements
interface RouteProps { path: string; element: ReactNode }     // '*' = fallback
interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
  replace?: boolean;
}
type Params = Record<string, string>;
type NavigateFunction = (to: string, options?: { replace?: boolean }) => void;

function useParams(): Params;
function useNavigate(): NavigateFunction;

// Follow-up 3
function useSearchParams(): [URLSearchParams, (next: Record<string, string> | URLSearchParams, options?: { replace?: boolean }) => void];
```

## Test contract
- Tests import the named exports above. `react-router` is mocked with a factory that throws, so importing it fails the whole file.
- Before each test the URL is reset with `window.history.pushState(null, '', '/')`, which also drops any forward entries.
- Page content is found with `getByRole('heading', { name })`. For example, a user page renders `<h1>User {id}</h1>` and the fallback renders `<h1>Not found</h1>`.
- Links are found with `getByRole('link', { name })` and must have `href` equal to `to`.
- Plain clicks use `userEvent`. Modifier clicks use `fireEvent.click(link, { metaKey: true })` / `{ ctrlKey: true }`, and a window-level listener checks whether `defaultPrevented` was set.
- `window.location.pathname` and `window.history.length` are checked after navigation, to tell `pushState` from `replaceState`.
- Back/forward is simulated as `window.history.pushState(null, '', path)` followed by `window.dispatchEvent(new PopStateEvent('popstate'))`, inside `act`. One test also uses the real `window.history.back()` and waits with `findByRole`.
- Follow-up 2 declares a dynamic route **before** a static one. Follow-up 3 reads `?q=` with `useSearchParams` and checks `window.location.search` after the setter runs.

## Edge cases
- `/users/` (empty param) must not match `/users/:id`. It falls through to `*`.
- `/users/42?tab=posts#top` still matches `/users/:id`.
- A malformed escape such as `/users/%E0%A4%A` makes `decodeURIComponent` throw. Don't crash; keep the raw value.
- Navigating to the current path: push a duplicate entry, or skip it? Explain your choice.
- A `Link` with `target="_blank"` or `download` must not be intercepted.
- A `Link` whose `onClick` calls `event.preventDefault()`: don't navigate.
- `navigate` called during render. Why is that wrong, and what does React warn about?
- `<Route>` wrapped in a Fragment or a custom component inside `<Routes>`. Unsupported here, but explain why `react-router` flattens Fragments.

## Follow-ups
1. **Nested routes and `<Outlet>`.** Allow `<Route path="/users" element={<UsersLayout />}>` with child `<Route path=":id" element={<User />} />`. The parent's element renders `<Outlet />` where the matched child goes. Params from every level merge in `useParams()`. How do you pass "the rest of the match" down through context?
2. **Route ranking.** Stop depending on declaration order. Score every route: static segments beat dynamic ones, dynamic beats `*`, and more segments beat fewer. `/users/new` must render the "new user" page even when `/users/:id` is declared first.
3. **Query-string hook.** Add `useSearchParams()`, which returns `[URLSearchParams, setSearchParams]`. The setter replaces the query string (push by default, `{ replace }` supported), keeps the pathname, and re-renders consumers. Why must you not mutate the returned `URLSearchParams` and expect a re-render?
4. **Blocking navigation.** A form with unsaved changes must confirm before leaving. Add `useBlocker(when)` that intercepts `Link`, `navigate` and back/forward. `popstate` can't be cancelled, so how do you undo a back? Also handle `beforeunload` for tab closes.
5. **Lazy routes.** `element={<Suspense fallback={<Spinner />}><LazyPage /></Suspense>}` with `React.lazy`. Should the old page stay visible while the new chunk loads? Wrap navigation in `startTransition` and explain the difference.

## Concepts covered
The History API (`pushState` and `replaceState` don't fire `popstate`; back/forward do) · a location store in React context, or `useSyncExternalStore` · path-to-regex matching with named params · config components read with `Children.toArray` · respecting modifier-key clicks · stable callbacks with `useCallback` · cleaning up global listeners.

Related: J25 Hooks pack · ST05 Mini Redux (useSyncExternalStore) · ST07 Hooks from scratch · S01 Modal Dialog (focus management).
