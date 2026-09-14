# Job Board (load more)

## Problem statement
Build a job board in the style of Hacker News "Who is hiring". The API works like the real HN API. One endpoint returns only the **ids** of all job postings, newest first. A second endpoint returns the details of **one** job by id.

Show the first 6 jobs. A `Load more jobs` button fetches and appends the next 6, until every job is shown. The interviewer is watching how you fetch in parallel, keep the page stable while loading, and avoid duplicate or missing requests.

## Clarifying questions to ask
- Should the job details of a page be fetched one after another or in parallel? *(In parallel.)*
- Should jobs appear one by one as they arrive, or all at once? *(All at once, once the whole page has loaded, so the list doesn't jump around.)*
- Do we re-fetch the id list when loading more? *(No. Fetch it once on mount.)*
- What if one job in a page fails? *(Treat the page as failed and offer a retry for that page. Partial rendering is follow-up 4.)*
- Where does a job link open? *(A new tab.)*

## Functional requirements
- [ ] Render a level-1 heading `Job Board`.
- [ ] On mount, call `getJobIds()` exactly once, then fetch the details of the first `pageSize` ids (default 6) **in parallel** with `getJob(id)`.
- [ ] While the first page is loading, show `Loading…`.
- [ ] A page is added to the list only when **all** of its jobs have loaded. Jobs are shown in id-list order.
- [ ] Each job is an item in a list and shows:
  - [ ] its title as a link to `job.url` that opens in a new tab safely,
  - [ ] the company and location,
  - [ ] the posted date, formatted in a human-readable way, e.g. `Sep 1, 2026`.
- [ ] If more ids remain, show a `Load more jobs` button below the list. Clicking it fetches the next `pageSize` jobs in parallel and appends them. Jobs already shown stay visible.
- [ ] While a page is loading, the button is disabled and its text changes to `Loading…`.
- [ ] Once every id has been loaded, the button is gone.
- [ ] If the id list is empty, show `No jobs yet.`
- [ ] If `getJobIds` or any `getJob` of a page fails, show an alert `Failed to load jobs.` with a `Retry` button. Retry repeats only what failed (the id list, or that page). Jobs already shown stay visible.

## Non-functional requirements
- **Accessibility:**
  - The jobs are in a semantic list (`<ul>`/`<ol>`), and each job is a `<li>`, ideally containing an `<article>`.
  - The loading text is in a live region (`role="status"`).
  - The error uses `role="alert"`.
  - After loading more, focus doesn't jump.
- **Performance:** requests within a page run concurrently. A page never triggers the same `getJob` twice, including under double clicks.
- **Robustness:** no state updates after unmount. Think about StrictMode running effects twice in development.
- **UX:** a card layout, with the company and date de-emphasised.

## Constraints
- 45 minutes. React and CSS Modules only, no data-fetching libraries.
- Import `getJobIds` and `getJob` from `../../../mocks/api`.

## Data / API contract
```ts
// src/mocks/api.ts
function getJobIds(options?: RequestOptions): Promise<number[]>;          // ~60 ids, newest first
function getJob(id: number, options?: RequestOptions): Promise<Job>;      // rejects with ApiError on failure

interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  postedAt: string; // ISO date
  url: string;
}

interface JobBoardProps {
  pageSize?: number; // default 6
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- `getJobIds` and `getJob` are replaced with `vi.fn()` via `vi.mock('../../../mocks/api')`.
- Heading: `getByRole('heading', { level: 1, name: 'Job Board' })`.
- Each job's title: `getByRole('link', { name: <title> })`, with `href` = `url`, `target="_blank"` and a `rel` containing `noopener`. The job links are the only links on the page.
- Each job's `listitem` contains the company and location text.
- Button: `getByRole('button', { name: 'Load more jobs' })`. While loading, `getByRole('button', { name: /loading/i })` is disabled.
- Texts: `Loading…` (matched with `/loading/i`) and `No jobs yet.`
- Error: `getByRole('alert')` containing `Failed to load jobs.`, and `getByRole('button', { name: 'Retry' })`.
- The date text isn't asserted, because it depends on time zone and locale.

## Edge cases
- The total count is not a multiple of `pageSize`, so the last page is short.
- Fewer ids than one page.
- Clicking `Load more jobs` twice quickly.
- A page fails, then the retry succeeds: no duplicate jobs.
- Unmounting while a page is in flight.

## Follow-ups
1. **Infinite scroll.** Replace the button with an `IntersectionObserver` on a sentinel element below the list that loads the next page when it scrolls into view. Keep the button as an accessible fallback. How do you avoid firing twice while a page is in flight?
2. **Relative dates.** Show "3 days ago" with `Intl.RelativeTimeFormat`, and put the full date in a `<time dateTime>` with a tooltip. When should the relative text refresh?
3. **Cancellation.** Pass an `AbortSignal` to every request and abort in-flight requests on unmount. Explain what StrictMode's double-invoked effects do to a naive "fetch on mount".
4. **Partial failures.** Use `Promise.allSettled`: render the jobs that loaded, and show `N jobs failed to load` with a retry for just those ids. Where do the failed jobs go in the order?

## Concepts covered
Two-step fetching (ids, then details) · `Promise.all` for parallel requests · page-based "load more" · keeping loaded data during loading and error states · guarding against duplicate requests · safe external links (`rel="noopener noreferrer"`) · `Intl.DateTimeFormat`.

Related: J21 Dictionary Search · J11 Pagination · S-level infinite feed.
