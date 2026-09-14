# Product Review Workflow

## Problem statement
This is Flipkart's "UI 2" machine-coding round. Build the "My Orders → Rate & Review" screen of a shopping app.

`ProductReviewFlow` loads the user's purchases and shows them in a list on the left. Clicking a product opens a review pane on the right, with a two-step flow:

1. **Rate:** pick 1–5 stars. You can't continue without a rating.
2. **Write:** a short review (required, at most 100 characters) with a live `37/100` counter, then Submit.

When the review is saved, a toast says `Review submitted` and the product is marked `Reviewed` in the list. Unfinished reviews are **drafts**: they are saved per product in `localStorage`, so switching products, or reloading the page, never loses what the user typed.

The data layer is injected through an `api` prop (`getPurchases`, `submitReview`). The Playground passes a fake server with adjustable latency and failure rate (`server.ts`), and the tests pass `vi.fn` mocks.

> Flipkart runs this round for 2.5 hours, in vanilla JS or React. It is followed by a **code-review round** on the same code, where the interviewer adds the requirements listed under Follow-ups and asks you to extend your solution live. Structure your code so it is easy to change.

## Clarifying questions to ask
- Is the review saved optimistically? *(No. Wait for the server. Optimistic submit is follow-up 3.)*
- Can a reviewed product be reviewed again or edited? *(Not in the base version. Its pane shows the saved review read-only. Editing is follow-up 2.)*
- Does the 100-character limit count the trimmed text? *(The counter shows the raw length of what's typed. Validation uses the trimmed text: it must be non-empty and at most 100 characters.)*
- When I come back to a product with a draft, which step opens? *(Always step 1, with the draft's rating already selected. The text is there when you go to step 2.)*
- When is the draft saved? *(On every change to the rating or the text. It is deleted after a successful submit.)*
- Are drafts kept for products that are no longer in the purchase list? *(Ignore them. Don't crash.)*
- Is there an images step? *(No. Image attachments are follow-up 1.)*

## Functional requirements
- [ ] **Load:** on mount, call `api.getPurchases({ signal })`. While it's pending, show `Loading purchases…`.
  - On failure, show an alert with `Failed to load purchases` and a `Retry` button that loads again.
  - With an empty list, show `No purchases yet`.
  - Abort the request on unmount.
- [ ] **Purchase list:** one item per purchase, in API order. Each item has a button showing the product name (and optionally the date and price). Products with a review show a `Reviewed` badge.
- [ ] **Selection:** clicking a product selects it and opens its review pane. The selected product's button has `aria-current="true"`. Before anything is selected, the pane area shows `Select a product to review`.
- [ ] **Pane for a reviewed product:** show the saved rating and text read-only. No form.
- [ ] **Step 1 (rating):**
  - Show `Step 1 of 2`.
  - A group of 5 radio buttons labelled `1 star`, `2 stars`, … `5 stars`.
  - A `Next` button, disabled until a rating is picked. It moves to step 2.
- [ ] **Step 2 (text):**
  - Show `Step 2 of 2`, a multi-line text field labelled `Review`, and a live counter `<length>/100` that updates on every keystroke.
  - When step 2 opens, focus the text field.
  - A `Back` button returns to step 1 and keeps the rating and text.
  - A `Submit` button, disabled while the trimmed text is empty, while it is longer than 100 characters, and while a submit is in flight. You may cap the input at 100 characters or let the user go over and show an error. Either way, more than 100 characters can never be submitted.
- [ ] **Submit:** call `api.submitReview(productId, { rating, text: trimmedText })`.
  - On success:
    - Show a toast (`role="status"`) with `Review submitted`. It disappears on its own after about 4 seconds.
    - Mark the product `Reviewed` in the list, and show the saved review in its pane.
    - Delete the product's draft.
  - On failure, keep the form and its values, re-enable Submit, and show an alert in the pane: `Could not submit review. Please try again.`
- [ ] **Drafts:**
  - Keep one draft (rating and text) per product.
  - Switching to another product and back restores the draft, opening at step 1 with the rating selected.
  - Persist drafts to `localStorage[storageKey]`, so they survive an unmount/remount. A missing or corrupt value counts as "no drafts".

## Non-functional requirements
- **Accessibility:**
  - The purchase list is a real list (`<ul>`/`<li>`) labelled `Purchases`. Each product is a `<button>`.
  - The review pane is a `<section>` with `aria-labelledby` pointing at its heading, `Review <product name>`, so it's exposed as a `region`.
  - Stars are native radio inputs inside a `<fieldset>` whose `<legend>` is `Rating` (or `role="radiogroup"` with `aria-label="Rating"`). They're visually styled as stars, but each one keeps a real text label.
  - The character counter is linked to the text field with `aria-describedby`. Don't announce every keystroke. A polite announcement near the limit is a bonus.
  - The toast is a `role="status"` live region, and it must not steal focus.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` | Moves through the list, the pane controls and the buttons in order |
  | `ArrowLeft/Right/Up/Down` (in the stars) | Native radio group behaviour: move and select the rating |
  | `Enter` / `Space` (on a product) | Select the product |

- **Performance:** the character counter is derived from the text during render, not stored in state. Throttling or debouncing `localStorage` writes is fine, but a draft must never be lost when the user switches products.
- **UX states:** loading, load error with retry, empty, nothing selected, submitting (the button reads `Submitting…`), submit error, and success toast.
- **Layout:** two panes side by side on wide screens, stacked on narrow screens.

## Constraints
- 90 minutes (the real round is 2.5 hours with styling). React and CSS Modules only. No form or state libraries.
- Talk to the backend only through the `api` prop. The Playground uses `createReviewServer` from `./server.ts`.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface Review { rating: number; text: string }        // rating 1–5, text trimmed, 1–100 chars
interface Purchase { id: string; name: string; purchasedAt: string; price: number; review: Review | null }

interface ReviewApi {
  getPurchases(options?: { signal?: AbortSignal }): Promise<Purchase[]>;
  submitReview(productId: string, review: Review, options?: { signal?: AbortSignal }): Promise<Review>;
}

interface ProductReviewFlowProps {
  api: ReviewApi;
  storageKey?: string;   // default "review-drafts"
}
```
A suggested storage shape is `{ [productId]: { rating: number | null, text: string } }`. The tests only check that drafts survive a remount, not the exact format.

Default-export the component from `Solution.tsx`.

## Test contract
- The loading state contains the text `Loading purchases…` (matched with `/loading purchases/i`).
- A load error is a `role="alert"` element containing `Failed to load purchases`, plus a button named `Retry`.
- The list is a `list` named `Purchases`. Each purchase is a `listitem` containing a `button` whose accessible name contains the product name. A reviewed product's `listitem` contains the text `Reviewed`.
- The selected product's button has `aria-current="true"`.
- The open pane is a `region` named `Review <product name>`. The pane text contains `Step 1 of 2` or `Step 2 of 2`.
- Stars are `radio` elements named `1 star`, `2 stars`, `3 stars`, `4 stars` and `5 stars`.
- The buttons are named `Next`, `Back` and `Submit`. While submitting, the submit button's name matches `/submit/i` and it is disabled.
- The text field is a `textbox` labelled `Review`. The counter text is exactly `<n>/100`, for example `5/100`.
- Success: some `role="status"` element contains `Review submitted`.
- Submit failure: a `role="alert"` inside the pane contains `Could not submit review`.
- `api` is a set of `vi.fn` mocks. Tests use unresolved promises to observe pending states.
- Drafts are checked by unmounting and rendering again with the same `storageKey`. `localStorage` is cleared between tests.

## Edge cases
- Clicking Submit twice quickly must send only one request.
- Switching products while a submit is in flight: the result must still update the right product, and the toast must still show.
- The user types 100 characters, then pastes more.
- Whitespace-only text: the counter shows its length, but Submit stays disabled.
- `localStorage` holds invalid JSON, or throws (Safari private mode). The app still works, just without persistence.
- A draft exists for a product that is already reviewed (for example, reviewed from another device). Show the saved review and ignore the draft.
- Retry pressed while a retry is already loading.

## Follow-ups
1. **Image attachments.** Add up to 3 images to a review (a file input that accepts `image/*`, at most 2 MB each) and show thumbnail previews with remove buttons. Use `URL.createObjectURL` and revoke the URLs when an image is removed or the component unmounts. How would you store image drafts, given that `localStorage` can't hold `File`s?
2. **Edit an existing review.** A reviewed product's pane gets an `Edit review` button that opens the same two-step flow prefilled with the saved review. Submitting calls a new `api.updateReview`. Share the form between create and edit without duplicating it.
3. **Optimistic submit with rollback.** Mark the product `Reviewed` and show the toast as soon as Submit is clicked. If the server fails, roll the product back to unreviewed, restore the draft into the form, and show the error.
4. **Unsaved-changes guard.** Product decides drafts should *not* auto-save while editing an existing review. If the user has unsaved edits and clicks another product, show a confirmation dialog, `Discard changes?`, with `Discard` and `Keep editing`. Also warn on tab close with `beforeunload`.
5. **Code review: refactor.** The interviewer asks you to split the solution into a `usePurchases` data hook, a `useDrafts(storageKey)` hook and presentational components, and to explain how you'd unit-test each piece.

## Concepts covered
Loading, error and retry states with `AbortController` · multi-step form state and derived validation · persisting UI state to `localStorage` safely · native radio groups styled as stars · `role="status"` toasts vs `role="alert"` errors · focus management between steps · dependency injection of the API for testability.

Related: S21 Users Directory CRUD · S10 Toast System · S33 useFetch · J25 Hooks pack (useLocalStorage).
