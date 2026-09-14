# Dictionary Search

## Problem statement
Build a small dictionary app. The user types a word, submits, and sees its definitions. Data comes from the mock API's `lookupWord(word, { signal })`, which resolves after a random delay and rejects with an `ApiError` whose `status` is `404` when the word isn't in the dictionary.

The core UI is simple. What the interviewer is really looking at is how you handle **async state**: loading, not-found, errors with retry, and the race condition you get when a slow old response comes back after a newer search.

Words the mock knows: `closure`, `debounce`, `hydrate`, `memoize`, `reconcile`, `throttle`, `virtualize`.

## Clarifying questions to ask
- Do we search on submit or while typing? *(On submit (button or Enter) for the base version. Search-as-you-type is follow-up 1.)*
- While a new search is loading, should the old result stay on screen? *(No. Replace it with the loading state.)*
- Is a not-found word an error? *(No. It's a normal empty state with its own message, not an alert.)*
- What happens if the user searches again before the first request finishes? *(Abort the old request. Only the latest search may update the UI.)*
- Is the lookup case-sensitive? *(No. Trim the input; the API handles the case.)*

## Functional requirements
- [ ] A form with a text input labelled `Word` and a submit button `Search`. Pressing Enter in the input submits.
- [ ] Before any search, show `Search for a word to see its definition.`
- [ ] Submitting a blank or whitespace-only value makes no request and shows `Please enter a word.`
- [ ] Submitting a word calls `lookupWord` with the **trimmed** word and an options object with an `AbortSignal`.
- [ ] While the request is in flight, show `Loading…` in place of any previous result.
- [ ] On success, show the word as a level-2 heading, followed by a list with one item per meaning. Each item shows the part of speech and the definition.
- [ ] If the API rejects with `status === 404`, show `No definitions found for "<word>".` using the trimmed word the user searched for.
- [ ] Any other failure shows an alert with `Something went wrong. Please try again.` and a `Retry` button that repeats the same search.
- [ ] Starting a new search aborts the previous in-flight request.
- [ ] Only the latest search may update the UI. A stale response or error that arrives late is ignored, and an aborted request never shows an error.

## Non-functional requirements
- **Accessibility:**
  - The input has a visible `<label>`.
  - The loading text is in a live region (`role="status"` or `aria-live="polite"`) so screen readers announce it.
  - The generic error uses `role="alert"`. The not-found message is not an alert.
  - Focus stays in the input after submitting.
- **UX:** the four states (idle, loading, success, not-found/error) are visually distinct. The part of speech is styled differently from the definition, e.g. italic.
- **Robustness:** no React warnings about state updates after unmount. Abort the in-flight request on unmount.

## Constraints
- 40 minutes. React and CSS Modules only, no data-fetching libraries.
- Import `lookupWord` (and `ApiError` if you need it) from `../../../mocks/api`.

## Data / API contract
```ts
// src/mocks/api.ts
function lookupWord(
  word: string,
  options?: { signal?: AbortSignal; latency?: number | [number, number]; failRate?: number },
): Promise<WordResult>; // rejects with ApiError { status: 404 } for unknown words,
                        // or a DOMException named "AbortError" when aborted

interface Meaning { partOfSpeech: string; definition: string }
interface WordResult { word: string; meanings: Meaning[] }

interface DictionarySearchProps {
  searchAsYouTypeMs?: number; // follow-up 1
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- `lookupWord` is replaced with a `vi.fn()` via `vi.mock('../../../mocks/api')`. `ApiError` is the real class. Mocked requests reject with an `AbortError` `DOMException` when their signal aborts.
- Input: `getByLabelText('Word')`. Button: `getByRole('button', { name: 'Search' })`.
- Texts: `Search for a word to see its definition.`, `Please enter a word.`, `Loading…` (matched with `/loading/i`), `No definitions found for "<word>".`
- Result: `getByRole('heading', { level: 2, name: <word> })`, plus one `listitem` per meaning containing its `definition` and `partOfSpeech`.
- Error: `getByRole('alert')` containing `Something went wrong`, and `getByRole('button', { name: 'Retry' })`.
- Abort: tests check `signal.aborted` on the options passed to the earlier `lookupWord` call.

## Edge cases
- Submitting the same word twice in a row, which is still a fresh request.
- Searching while an error is shown: the alert must go away.
- The slow first response arrives after the fast second one.
- Unmounting mid-request.
- A word with several meanings. Don't key list items by `partOfSpeech` alone.

## Follow-ups
1. **Search as you type.** When `searchAsYouTypeMs` is set, search automatically once the user has stopped typing for that many ms. Submitting still works immediately. Clearing the input cancels any pending search and returns to the idle text without making a request.
2. **Cache.** Keep an in-memory cache of successful lookups for the component's lifetime, keyed by the trimmed, lowercased word. A repeated search shows the cached result immediately, with no `Loading…` and no request.
3. **Recent searches.** Show the last 5 distinct successful searches as buttons, most recent first. Clicking one runs that search again.
4. **URL state.** Sync the current word to `?q=` so that reloading or sharing the link restores the search, and browser back/forward moves between searches. What should happen to in-flight requests on navigation?

## Concepts covered
Async UI state machines (idle / loading / success / empty / error) · `AbortController` · race conditions and stale responses · controlled forms · error vs empty states · live regions · mocking modules in tests.

Related: J22 Job Board · J25 useDebounce · S02 Autocomplete.
