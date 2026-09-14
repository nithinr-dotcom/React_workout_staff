# Autocomplete / Typeahead

## Problem statement
Build an `Autocomplete` input that suggests matches from a remote source as the user types. Think of the search box on a food-delivery or travel site: you type a few letters, a list of suggestions appears, and you pick one with the mouse or the keyboard.

The data source is asynchronous and slow, and responses can arrive out of order. Your component must not flood the backend, must never show results for a query the user has already moved past, and must be fully usable with a keyboard and a screen reader.

By default, search countries with `searchCountries` from the mock API. The data source is injectable through the `fetchSuggestions` prop, so tests (and other screens) can supply their own.

## Clarifying questions to ask
- How long should we wait after typing before searching? *(300 ms by default, configurable with `debounceMs`.)*
- What is the minimum query length? *(1 non-whitespace character by default, configurable with `minChars`. Leading and trailing whitespace is ignored.)*
- Is matching done on the client or the server? *(Server. Show whatever `fetchSuggestions` returns, in that order.)*
- Should results be cached? *(Yes, in memory, per component instance, keyed by the trimmed query. No eviction for the base version.)*
- Can the user submit free text that isn't a suggestion? *(Not in the base version.)*
- What happens to the input text after a selection? *(It becomes the selected suggestion's label and the list closes.)*
- Should we cancel in-flight requests? *(Yes, when they become irrelevant. Stale responses must be ignored even if the data source ignores the abort signal.)*

## Functional requirements
- [ ] Render a labelled text input. Typing updates it immediately.
- [ ] Search only after the user has stopped typing for `debounceMs`. A burst of keystrokes causes **one** request, for the final text.
- [ ] Call `fetchSuggestions(trimmedQuery, { signal })`. A query shorter than `minChars` after trimming makes no request and closes the list.
- [ ] While a request is pending, show a loading message in the popup.
- [ ] Show the suggestions returned for the **latest** query. A response for an older query must never be displayed, regardless of the order in which responses arrive.
- [ ] When a newer search starts (or the input is cleared, or a suggestion is selected, or the component unmounts), abort the previous in-flight request through its `AbortSignal`.
- [ ] Cache successful responses by trimmed query. Searching a cached query again shows the cached suggestions without calling `fetchSuggestions`. Failed requests are not cached.
- [ ] If the request returns no suggestions, show `No results`.
- [ ] If the request fails (for any reason other than being aborted), show `Couldn't load suggestions` and a `Retry` button that immediately re-runs the current query.
- [ ] In each suggestion, wrap the first case-insensitive occurrence of the query in a `<mark>` element.
- [ ] Clicking a suggestion selects it.
- [ ] Selecting a suggestion calls `onSelect(suggestion)`, sets the input text to its label, closes the list, and does **not** start a new search.
- [ ] Moving focus out of the input closes the list. Clicking inside the popup (an option, or `Retry`) must not steal focus from the input.
- [ ] Keyboard support as described in the table below.

## Non-functional requirements
- **Accessibility:** follow the [WAI-ARIA Combobox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) (list autocomplete, "editable combobox with list autocomplete").
  - The input has `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded`, and `aria-controls` pointing to the listbox.
  - Suggestions are `role="option"` elements inside a `role="listbox"`.
  - DOM focus **stays on the input** while navigating. The highlighted option is communicated with `aria-activedescendant` on the input and `aria-selected="true"` on the option.
  - Loading, empty and error messages are announced (a live region such as `role="status"`, or `role="alert"` for the error).
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `ArrowDown` | Open the list if there are suggestions; highlight the next option, wrapping from last to first |
  | `ArrowUp` | Highlight the previous option, wrapping from first to last |
  | `Enter` | Select the highlighted option. Does nothing if no option is highlighted |
  | `Escape` | Close the list. If the list is already closed, clear the input |
  | Typing | Clears the highlight and schedules a new search |
- **Performance:** at most one request per debounce window; no request for a cached query; no state updates after unmount.
- **UX:** the highlighted option is scrolled into view; the highlight follows the mouse on hover; the popup is visually attached to the input.

## Constraints
- 75 minutes. React and CSS Modules only. No data-fetching or combobox libraries.
- Default data source: `searchCountries` from `src/mocks/api.ts` (map each country to `{ id: code, label: name }`).
- Keep the public types in `types.ts` unchanged, because the tests and Playground depend on them.

## Data / API contract
```ts
interface Suggestion { id: string; label: string }

type FetchSuggestions = (query: string, options: { signal: AbortSignal }) => Promise<Suggestion[]>;

interface AutocompleteProps {
  label: string;
  placeholder?: string;
  fetchSuggestions?: FetchSuggestions; // default: searchCountries mapped to Suggestion
  onSelect?: (suggestion: Suggestion) => void;
  debounceMs?: number;                 // default 300
  minChars?: number;                   // default 1
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- The input is a `combobox` whose accessible name is the `label` prop. It has `aria-expanded="false"` initially, and `aria-expanded="true"` while suggestions are shown.
- While suggestions are shown, there is a `listbox` whose `id` equals the combobox's `aria-controls`. When the list is closed, no `listbox` is exposed (not rendered, or `hidden`).
- Each suggestion is an `option` whose accessible name is its `label`. The matched text is inside a `<mark>` element.
- The highlighted option has `aria-selected="true"`, and its `id` equals the combobox's `aria-activedescendant`.
- Loading text matches `/loading/i`. Empty text is `No results`. Error text is `Couldn't load suggestions`, with a `button` named `Retry`.
- Tests inject `fetchSuggestions` as a mock and use fake timers (`vi.useFakeTimers({ shouldAdvanceTime: true })`) to control the debounce. They check the query argument, the `signal` argument (`signal.aborted`), and the number of calls.

## Edge cases
- Responses arrive out of order: the request for `"in"` resolves after the request for `"ind"`.
- The data source ignores the abort signal and resolves anyway.
- An aborted request rejects with an `AbortError`: this is not an error state.
- The user types, then deletes everything before the debounce fires: no request, list closed.
- The query contains regex special characters, such as `(` or `.`: highlighting must not throw.
- The same query typed again after a detour (`in` → `ind` → `in`) is served from the cache.
- The component unmounts while a request is pending or a debounce timer is scheduled.
- Two autocompletes on one page must not share ids or caches.

## Follow-ups
1. **Cache eviction.** Bound the cache: keep at most 50 entries (least recently used is evicted first) and expire entries after 60 seconds. Where should this logic live so it can be unit-tested without React?
2. **Headless hook.** Extract the behaviour into a `useCombobox` hook (or compound components) that returns prop getters (`getInputProps`, `getOptionProps(index)`), so a design system can render any markup. Discuss the tradeoffs versus a `renderOption` prop.
3. **Free text and controlled value.** Add `value`/`onChange` props and an `onSubmit(text)` that fires on `Enter` when nothing is highlighted. How do you avoid a search being triggered when the parent sets the value programmatically?
4. **Prefix-based cache reuse.** If results for `"ind"` are cached and complete (fewer than the server's page limit), filter them locally for `"indi"` instead of making a request. What makes this unsafe in general?
5. **Grouped and recent results.** Show "Recent searches" when the input is focused and empty, and group server results by region with non-selectable group headings. Which ARIA roles change?

## Concepts covered
Debouncing inside a component (timer refs and cleanup) · `AbortController` and request cancellation · guarding against stale responses with request ids · in-memory caching with `Map` · the ARIA combobox pattern with `aria-activedescendant` · keeping focus in the input while the mouse interacts with a popup (`mousedown` + `preventDefault`) · loading, empty and error states.

Related: J23 debounce · J25 hooks pack (`useDebounce`) · S11 Multi-select Dropdown · S03 Infinite Scroll Feed.
