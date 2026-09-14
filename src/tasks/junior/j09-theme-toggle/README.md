# Theme Toggle

## Problem statement
Add dark mode to an app. Build three pieces in `Solution.tsx`:

- `ThemeProvider` owns the user's theme preference and applies the resolved theme to the page.
- `useTheme()` lets any component read and change the theme.
- `ThemeToggle` (the default export) is a small control for choosing **Light**, **Dark** or **System**.

"System" follows the operating system's setting and keeps following it if the OS switches while the page is open. The choice survives a reload.

## Clarifying questions to ask
- Where is the theme applied? *(As `data-theme="light|dark"` on `document.documentElement`, so CSS anywhere can use `[data-theme="dark"]` to swap CSS variables.)*
- Is the stored value the preference or the resolved theme? *(The preference: `light`, `dark` or `system`. Storing the resolved value would lose "follow the OS".)*
- Which storage key? *(`theme`, overridable with `storageKey`.)*
- What should `useTheme` do outside a provider? *(Throw a descriptive error. Silent defaults hide bugs.)*
- Do we need to avoid a flash of the wrong theme on first paint? *(Not for this exercise. It's a follow-up.)*

## Functional requirements
- [ ] `ThemeProvider` reads the stored preference from `localStorage[storageKey]` on mount. A missing or invalid value falls back to `defaultTheme` (default `system`).
- [ ] The resolved theme is `light`/`dark` directly, or for `system` it comes from `window.matchMedia('(prefers-color-scheme: dark)').matches`.
- [ ] The resolved theme is set as `data-theme` on `document.documentElement` and kept in sync.
- [ ] `setTheme(t)` updates the preference and writes it to `localStorage[storageKey]`.
- [ ] While the preference is `system`, a `change` event on the media query list updates the resolved theme. Unsubscribe when the preference leaves `system` and on unmount.
- [ ] `useTheme()` returns `{ theme, resolvedTheme, setTheme }`. Called outside a `ThemeProvider` it throws an `Error`.
- [ ] `ThemeToggle` renders a radio group labelled `Theme` with the options `Light`, `Dark` and `System`; the checked option matches the preference.
- [ ] Style a demo in the Playground with CSS custom properties (`--bg`, `--fg`, …) switched by `[data-theme="dark"]`, not with inline colours computed in JavaScript.

## Non-functional requirements
- **Accessibility:** follow the [WAI-ARIA Radio Group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/). Native `<fieldset>` + `<legend>` + `<input type="radio">` gives you this for free.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Focus the checked option |
  | `ArrowUp` / `ArrowLeft`, `ArrowDown` / `ArrowRight` | Select the previous / next option (native radio behaviour) |
  | `Space` | Select the focused option |
- **Performance:** components that only call `setTheme` shouldn't need to re-render when the theme changes. Mention how you'd achieve that, even if you don't build it.
- **Robustness:** `localStorage` can throw (Safari private mode, blocked storage). Reading or writing must not crash the app.

## Constraints
- 35 minutes. React and CSS Modules only. No theming libraries.
- `Solution.tsx` exports `ThemeProvider` and `useTheme` as named exports and `ThemeToggle` as the default export.
- Keep the public types in `types.ts` unchanged, because the tests and Playground depend on them.

## Data / API contract
```ts
type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: ThemePreference; // default 'system'
  storageKey?: string;            // default 'theme'
}

// Solution.tsx
export function ThemeProvider(props: ThemeProviderProps): JSX.Element;
export function useTheme(): ThemeContextValue;
export default function ThemeToggle(): JSX.Element;
```

## Test contract
- Tests render `<ThemeProvider><ThemeToggle /></ThemeProvider>`.
- The toggle's options are `radio`s named `Light`, `Dark` and `System`, grouped under the name `Theme` (a `<fieldset>` with `<legend>Theme</legend>`, or `role="radiogroup"` with `aria-label="Theme"`). Tests find the radios by name and check `toBeChecked()`, and change the theme with `user.click(radio)`.
- Tests read `document.documentElement.getAttribute('data-theme')`.
- Tests read `localStorage.getItem('theme')` (or the custom `storageKey`).
- Tests replace `window.matchMedia` with a fake whose `matches` they control and whose `change` listeners they fire. Subscribe with `mql.addEventListener('change', …)`.
- `useTheme` is tested with `renderHook(..., { wrapper: ThemeProvider })`, and outside a provider it must throw.

## Edge cases
- A stored value like `"blue"` or `"null"`.
- The OS switches to dark while the preference is `light`: nothing changes.
- Switching from `system` to `dark` and back to `system` must re-read the current OS value, not a cached one.
- Two providers mounted at once (for example in Storybook). *(Assume one per page.)*

## Follow-ups
1. **No flash of the wrong theme.** On a server-rendered page, the first paint happens before React loads. Write the tiny inline `<script>` for `<head>` that sets `data-theme` before paint, and explain how the provider stays consistent with it.
2. **Sync across tabs.** Changing the theme in one tab updates every other open tab. Which event do you listen to, and why doesn't it fire in the tab that made the change?
3. **Split contexts.** Split into a state context and a dispatch context (or use `useSyncExternalStore` with a tiny store), so that components that only call `setTheme` don't re-render when the theme changes. Show it with the React Profiler.
4. **Scoped themes.** Let a subtree force a theme (for example a dark code sample in a light page) with a nested `<ThemeProvider theme="dark">` that applies to a wrapper element instead of `<html>`.

## Concepts covered
Context + custom hook with a guard · lazy state initialisation from storage · `matchMedia` subscriptions and cleanup · CSS custom properties · separating preference from resolved value.

Related: J25 Hooks pack (`useLocalStorage`) · ST01 Design-system Select.
