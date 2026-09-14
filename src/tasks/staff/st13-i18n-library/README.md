# i18n Library

## Problem statement
Your company is expanding from English-only to 12 locales, including Arabic and Hebrew. The platform team (you) owns the i18n library that every product team will use. Build it without `react-intl` or `i18next`.

The library has two layers:
1. **A framework-agnostic core.** `createI18n({ locale, fallbackLocale, loadMessages })` owns the active locale and a cache of lazily loaded catalogs. Its `t(key, params)` resolves keys through a fallback chain and formats them.
2. **React bindings.** `<I18nProvider>`, `useT()` and `useI18n()` re-render consumers when the locale changes. The provider also keeps the document's `lang` and `dir` attributes in sync.

Messages use an **ICU-lite** syntax: `{name}` interpolation, plus plurals such as `{count, plural, =0 {No items} one {# item} other {# items}}`. Plural categories come from `Intl.PluralRules`, so languages with more than two plural forms (Arabic has six) work correctly. Export the formatter as the pure function `formatMessage(message, params, locale)`, which is easy to unit test.

`types.ts` is the minimal contract that the tests and Playground depend on. The API design is part of the exercise, so extend it where you see fit, but don't break it.

## Clarifying questions to ask
- Are catalogs nested objects or flat dotted keys? *(Flat: `{ "cart.title": "Your cart" }`.)*
- Do catalogs ship in the bundle or load over the network? *(Loaded lazily per locale through `loadMessages`, and cached. SSR-inlined catalogs can be passed as `messages`.)*
- What renders before the first catalog arrives? *(The provider's `fallback`. If the catalog was preloaded, the real UI renders on the very first render, with no flash.)*
- What happens on screen while switching to a locale that hasn't loaded yet? *(The previous locale keeps rendering, and `isLoading` is true. No flash of keys or fallback.)*
- What does a missing key render? *(The fallback locale's string, otherwise the key itself. Report it with `onMissingKey`.)*
- Which ICU features are in scope? *(`{arg}` and `{arg, plural, …}` with `=N` exact matches and `#`. `select`, `selectordinal` and escaping are follow-ups.)*

## Functional requirements
- [ ] `formatMessage(message, params, locale)` (pure):
  - [ ] `{name}` is replaced with `String(params.name)`. A placeholder with no matching param stays as-is, e.g. `{missing}`.
  - [ ] `{n, plural, …branches}` picks the `=N` branch whose N equals the value exactly. Otherwise it picks the branch for `new Intl.PluralRules(locale).select(n)`. Otherwise it picks `other`.
  - [ ] Inside the chosen plural branch, `#` becomes `new Intl.NumberFormat(locale).format(n)`, and nested `{name}` placeholders are interpolated.
- [ ] `createI18n(options)` immediately starts loading the `locale` and `fallbackLocale` catalogs, unless they were given in `options.messages`. `loadMessages` is called **at most once per locale**.
- [ ] `t(key, params)` looks the key up in the active locale's catalog, then the fallback locale's, then returns the key itself. Whenever the key is missing from the active locale, it calls `onMissingKey(key, activeLocale)`. By default that is a `console.warn` in development only.
- [ ] `setLocale(next)`:
  - loads `next` if it isn't cached, while `isLoading` is `true` and the **previous locale keeps rendering**
  - then switches the locale and notifies subscribers
  - if a newer `setLocale` call was made while this one was loading, the newer call wins
  - if loading fails, it stays on the current locale and rejects
- [ ] `<I18nProvider i18n fallback>` renders `fallback` until the initial locale's catalog is available, then renders `children`.
- [ ] `useT()` returns a `t` bound to the active locale. Components re-render on locale change.
- [ ] `useI18n()` returns `{ locale, isLoading, dir, setLocale, formatNumber, formatDate }`. The formatters use `Intl` with the active locale.
- [ ] `dir` is `'rtl'` for locales whose language subtag is `ar`, `he`, `fa` or `ur`, and `'ltr'` otherwise. While mounted, the provider sets `lang` and `dir` on `document.documentElement` to match the active locale.

## Non-functional requirements
- **Accessibility:**
  - Correct `lang` lets screen readers pick the right voice and pronunciation.
  - Correct `dir` flips layout and caret behaviour.
  - Use CSS logical properties (`margin-inline-start`) in the Playground so RTL works without separate stylesheets.
  - The language switcher is a native `<select>` or buttons with visible labels, each written in its own language, e.g. "Français".
- **Performance:**
  - Constructing `Intl.*` objects is expensive, so cache formatters and plural rules per locale and options.
  - Don't re-parse the same message string on every render.
  - Components must not re-render when a locale they aren't showing finishes loading in the background.
- **Bundle:** each locale is its own chunk, loaded on demand. Only the fallback locale may be eager.
- **UX states:** loading the initial catalog (`fallback`), switching (`isLoading`), and a failed load (stay on the current locale, surface the error to the caller).

## Constraints
- 100 minutes. React, TypeScript and the `Intl` APIs only. No i18n or ICU libraries.
- No mock API. Sample catalogs live in `data.ts`, with a `loadMessages` that simulates latency.
- Export `createI18n`, `I18nProvider`, `useT`, `useI18n` and `formatMessage` from `Solution.tsx`.

## Data / API contract
```ts
type Messages = Record<string, string>;
type MessageParams = Record<string, string | number>;

interface I18nOptions {
  locale: string;
  fallbackLocale: string;
  loadMessages: (locale: string) => Promise<Messages>;
  messages?: Record<string, Messages>;
  onMissingKey?: (key: string, locale: string) => void;
}

interface I18n {
  readonly fallbackLocale: string;
  getLocale(): string;
  setLocale(locale: string): Promise<void>;
  t(key: string, params?: MessageParams): string;
  subscribe(listener: () => void): () => void;
}

interface I18nProviderProps { i18n: I18n; fallback?: ReactNode; children: ReactNode }
type TranslateFn = (key: string, params?: MessageParams) => string;

interface I18nContextValue {
  locale: string;
  isLoading: boolean;
  dir: 'ltr' | 'rtl';
  setLocale(locale: string): Promise<void>;
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  formatDate(value: Date | number, options?: Intl.DateTimeFormatOptions): string;
}

export function createI18n(options: I18nOptions): I18n;
export function I18nProvider(props: I18nProviderProps): ReactNode;
export function useT(): TranslateFn;
export function useI18n(): I18nContextValue;
export function formatMessage(message: string, params: MessageParams | undefined, locale: string): string;
```

## Test contract
- `formatMessage` is called directly. Plural and number output is compared with `Intl.PluralRules` and `Intl.NumberFormat` results computed in the test, never with hard-coded locale-formatted strings.
- Tests pass `loadMessages` as `vi.fn()`, often returning a deferred promise, and check how often and with which locale it was called.
- The provider's `fallback` is rendered as `<p>Loading…</p>` and must be visible synchronously after the first render when the catalog isn't preloaded.
- With `messages` preloaded for the initial locale, the translated text is present synchronously after `render`, and `loadMessages` is not called for that locale.
- Test components render `t(...)` output as text, show `Switching…` while `useI18n().isLoading` is true, and call `setLocale` from buttons.
- RTL checks read `document.documentElement.getAttribute('dir' | 'lang')`.

## Edge cases
- `setLocale('fr')` then `setLocale('de')` before `fr` resolves: the final locale is `de`, even if `fr` resolves last.
- `setLocale` to the already active locale: no load and no extra notifications.
- `loadMessages` rejects for the initial locale. Decide between the fallback locale and an error state, and document your choice.
- A plural whose argument is missing or isn't a number.
- Locale tags with regions: `ar-EG` is RTL, and `pt-BR` → `pt` catalog fallback is a follow-up.
- Nested braces: `{count, plural, one {{name} has # file} other {{name} has # files}}`.
- `#` in a nested plural refers to the innermost plural's value.
- The same missing key is rendered 1,000 times. Don't spam the console.

## Follow-ups
1. **`select` and `selectordinal`.** Support `{gender, select, female {…} male {…} other {…}}` and `{n, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}`.
2. **Region fallback chain.** Resolve through `pt-BR` → `pt` → `fallbackLocale`. Load catalogs for the whole chain in parallel.
3. **Compile once.** Parse each message into an AST (or a closure) once per locale and cache it. Measure formatting 10,000 messages before and after.
4. **Rich text.** `t.rich('terms', { link: (chunks) => <a href="/terms">{chunks}</a> })` for messages like `Accept the <link>terms</link>`, returning React nodes without `dangerouslySetInnerHTML`.
5. **Suspense mode.** `useT({ suspense: true })` throws the loading promise so a `<Suspense>` boundary handles loading. Compare it with the `isLoading` approach, especially for locale *switches* (hint: `useTransition`).
6. **Type-safe keys.** Generate a `MessageKey` union from the English catalog so `t('typo')` is a compile error, and so `params` is typed from the placeholders.

## Concepts covered
`Intl.PluralRules`, `Intl.NumberFormat` and `Intl.DateTimeFormat` · parsing nested brace syntax · lazy loading with caching and race handling · an external store plus React context · fallback chains · `lang` and `dir` attributes and logical CSS properties.

Related: ST09 Feature Flag Framework (provider plus bootstrapping without flicker) · ST06 Mini React Query (caching async resources) · ST12 Plugin Shell.

## Design discussion prompts
- Why keep a framework-agnostic core under the React bindings? Who else consumes it (emails, server rendering, workers)?
- How do you avoid a flash of untranslated or fallback content on first load with SSR? Where do catalogs get inlined, and how big can they get?
- Translators work in a TMS and ship updates weekly. How do catalogs get from the TMS into the app without a frontend deploy, and how do you cache-bust them?
- What is your policy for missing keys in production versus development? How would you catch them in CI before release?
- `t()` called in a module-level constant (`const LABEL = t('save')`) is a classic bug. Why, and how would you prevent it with API design or linting?
- How would you migrate 400 components from hard-coded English strings to `t()` incrementally? What codemods and metrics would you use?
- Pseudo-localisation (`[Ŝåṽé ţĥîš]`, 40% longer): how would you add it, and what bugs does it catch?
- Plurals, genders, number and date formats, and RTL mirroring of icons: which belong in the library, and which belong to product teams?
