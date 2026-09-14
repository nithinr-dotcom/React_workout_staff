# Product Listing + Cart

## Problem statement
Build a small storefront, `ProductCart`, in the style of Flipkart or Swiggy Instamart. On mount it loads the product catalogue. Users can filter by category, search by title and sort the list. They can add products to a cart, change quantities within the available stock, and remove lines. The cart shows a subtotal, shipping and a total formatted as currency. It survives a page reload.

The interviewer is looking for clean state boundaries: server data vs. cart state vs. UI filter state vs. derived values. They also look for correct money handling and for a fetch that behaves when it is slow, fails or is abandoned.

## Clarifying questions to ask
- Are filtering, search and sorting done on the server or the client? *(Client. Fetch the whole catalogue once, then derive the visible list.)*
- Which currency and locale? *(US dollars, `en-US`: `$1,299.00`.)*
- Is there shipping or tax? *(No tax. Shipping is `$9.99`, and free when the subtotal is `$100.00` or more.)*
- Does the cart reserve stock? *(No. The limit is simply that a line's quantity can't exceed the product's `stock`.)*
- What happens to a stored cart line whose product no longer exists or is out of stock? *(Drop it. If the stored quantity is above the stock, reduce it to the stock.)*
- Should prices be persisted with the cart? *(No. Persist ids and quantities only. Prices always come from the latest catalogue.)*

## Functional requirements
- [ ] On mount, call `fetchProducts({ signal })` once. While it is pending show `Loading products…`. Abort the request if the component unmounts.
- [ ] If the request fails, show an error message containing `Couldn't load products` and a **Retry** button that fetches again.
- [ ] Render each product with its title, brand, category, price (formatted), rating, and an **Add to cart** button.
- [ ] Stock labels: `stock === 0` shows `Out of stock` and the add button is disabled. `stock` from 1 to 3 shows `Only N left` (e.g. `Only 3 left`).
- [ ] **Category** select: `All categories` (default) plus each category present in the catalogue.
- [ ] **Search products** input: case-insensitive "title contains" match on the trimmed query.
- [ ] **Sort by** select with options `Featured` (catalogue order, default), `Price: low to high`, `Price: high to low`, `Rating: high to low`. Sorting is stable: ties keep catalogue order.
- [ ] Filters, search and sort combine. When nothing matches, show `No products match your filters`.
- [ ] **Add to cart** adds one unit. Adding a product already in the cart increases its quantity by one. The button is disabled once the cart quantity equals the stock.
- [ ] The cart lists one line per product in the order they were first added. Each line shows the title, unit price, a quantity field, decrease/increase buttons and a remove button.
  - Increase is disabled at `stock`.
  - Decreasing at quantity 1 removes the line.
  - Typing into the quantity field sets the quantity, clamped to `1…stock`. Leaving the field empty restores the previous quantity.
- [ ] Next to the `Cart` heading (not inside it), show the total number of units as `N items` (`1 item` for one).
- [ ] An empty cart shows `Your cart is empty` and no totals.
- [ ] Totals: **Subtotal** is the sum of `price × quantity`. **Shipping** is `$9.99`, or `Free` when the subtotal is ≥ `$100.00`. **Total** is subtotal + shipping. Every amount is formatted with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.
- [ ] Persist the cart as `CartLine[]` JSON under `storageKey` (default `"product-cart"`) on every cart change. Restore it on mount and reconcile it with the catalogue once it loads.

## Non-functional requirements
- **Accessibility:**
  - The product list and the cart are separate landmarks. The cart is a `<section>` labelled by its `Cart` heading.
  - Each product is an `<article>` labelled by its title heading.
  - All controls have labels. Quantity buttons include the product title in their accessible name.
  - Totals use `<output>` elements (implicit `status` role), so updated amounts are exposed to assistive tech.
  - When a line is removed, don't drop focus onto `<body>`. Move it somewhere sensible, such as the next line or the cart heading.
- **Keyboard:**

  | Key | Where | Behaviour |
  |---|---|---|
  | `Tab` | Page | Reach filters, every product's add button, then the cart controls |
  | `ArrowUp` / `ArrowDown` | Quantity field | Native number input stepping, still clamped to `1…stock` |
  | `Enter` / `Space` | Buttons | Native activation |
- **Correctness:** do money math in integer cents. `0.1 + 0.2` is not `0.3`.
- **Performance:** derive the visible products with `useMemo` from `(products, category, query, sort)`. Don't store derived lists in state.
- **UX states:** loading, error with retry, empty catalogue result, empty cart.

## Constraints
- 90 minutes. React, CSS Modules, `Intl`. No state or data libraries.
- Data comes from `getProducts` in `src/mocks/api.ts` via the injectable `fetchProducts` prop. Use `useReducer` for the cart.
- Keep `types.ts` unchanged.

## Data / API contract
```ts
import type { Product } from '../../../mocks/api';
// Product: { id: number; title: string; category: 'Audio' | 'Laptops' | 'Phones' | 'Wearables' | 'Accessories';
//            brand: string; price: number; rating: number; stock: number }

type FetchProducts = (options: { signal: AbortSignal }) => Promise<Product[]>;

interface CartLine { productId: number; quantity: number } // persisted shape

interface ProductCartProps {
  fetchProducts?: FetchProducts; // default: (options) => getProducts({}, options)
  storageKey?: string;           // default "product-cart"
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Tests pass their own `fetchProducts`, which resolves, rejects or stays pending as they need. It is called with an object containing an `AbortSignal` as `signal`.
- Loading text matches `/loading products/i`. The error is a `role="alert"` element whose text contains `Couldn't load products`, next to a `button` named `Retry`.
- Products are the only `article` elements on the page. Each article's accessible name is the product title. Inside it:
  - the formatted price as its own text node, e.g. `$49.99`;
  - `Out of stock` or `Only N left` text where applicable;
  - a `button` named `Add to cart`.
- Filters are found by label: `Category` (a `<select>` with options `All categories`, …category names), `Search products`, and `Sort by` (a `<select>` with the option texts listed above).
- Empty result text: `No products match your filters`.
- The cart is a `region` named exactly `Cart`, so the heading text is just `Cart`. Inside it:
  - item count text `N items` / `1 item`, or `Your cart is empty`;
  - one `listitem` per line;
  - a number input (`spinbutton`) labelled `Quantity of <title>`;
  - buttons named `Decrease quantity of <title>`, `Increase quantity of <title>` and `Remove <title>`;
  - `status` elements named `Subtotal`, `Shipping` and `Total`, whose text is the formatted amount (or `Free`).
- `localStorage.getItem('product-cart')` holds `CartLine[]` JSON.

## Edge cases
- Stored cart JSON that is corrupt, or refers to unknown products: ignore bad entries and never crash.
- Don't overwrite the stored cart with an empty cart while the catalogue is still loading.
- Retry after an error must not leave two requests racing. Abort the old one.
- A product whose stock is 0 but which is still in the stored cart.
- Floating-point totals: `49.99 × 2 + 9.99` must show `$109.97`.
- A filter that hides a product doesn't remove it from the cart.

## Follow-ups
1. **URL state.** Sync category, search and sort to the query string (`?category=Audio&q=pro&sort=price-asc`) so a filtered view can be shared, and the back button restores the previous filter.
2. **Server-side filtering.** The catalogue is now 50,000 products. Move filtering to `getProducts({ category, search })`, debounce the search, cancel in-flight requests, and keep showing the old results (dimmed) while new ones load.
3. **Optimistic checkout.** Add a "Place order" button that calls a flaky API. Disable double-submits, show progress, and on a stock conflict (409) update the affected lines and explain what changed.
4. **Cart across tabs.** Keep two tabs' carts in sync with the `storage` event or `BroadcastChannel`. Which one would you pick, and why?
5. **Coupons.** Support `SAVE10` (10% off the subtotal, applied before the shipping threshold check) and `FREESHIP`. Explain the rounding rule you chose for percentage discounts on cents.

## Concepts covered
`useReducer` for cart transitions · derived state with `useMemo` · fetch lifecycle with `AbortController` and retry · `Intl.NumberFormat` currency formatting · integer-cent arithmetic · lazy state initialisation from `localStorage` and reconciliation with server data · labelled landmarks and `<output>`.

Related: S08 Data Table (filter/sort/derive) · S18 Kanban Board (persistence) · J25 hooks pack (`useLocalStorage`, `useFetch`).
