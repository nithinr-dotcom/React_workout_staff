# Expense Splitter (Splitwise)

## Problem statement
Build a small Splitwise for a trip with friends. `ExpenseSplitter` lets the group:

- **add members** by name
- **add expenses**: who paid, how much, and who shared it. Split it **equally**, or with **exact amounts** per person that must add up to the total.
- see each member's **balance** (who owes, who is owed)
- see a short list of **settlements** that would square everyone up, for example `Ben pays Asha ₹300.00`
- **delete** an expense, with every balance updating

Money must be exact. Store and compute every amount as an **integer number of paise** (1 rupee = 100 paise), never as floating-point rupees. When an equal split doesn't divide evenly, the leftover paise are handed out by a deterministic rule, so the balances always add up to exactly zero.

Also export a **pure** function, `simplifyDebts(balances)`, that turns net balances into a list of payments. The component uses it, and the tests call it directly.

## Clarifying questions to ask
- How are leftover paise assigned in an equal split? *(Divide and round down. Then give 1 extra paisa to each participant in member order (the order they were added), starting with the first, until the total is matched. For example, ₹100.00 split between Asha, Ben and Chen is 3334 / 3333 / 3333 paise.)*
- Must `simplifyDebts` find the minimum number of payments? *(No. That's NP-hard in general. It must return at most (number of non-zero members − 1) payments, and nobody may both pay and receive. A greedy "largest debtor pays largest creditor" approach is fine.)*
- Can the payer be left out of the participants? *(Yes. Paying for something you didn't share is allowed.)*
- Can members be removed or renamed? *(Not in the base version.)*
- Is a member name case-sensitive? *(Names are trimmed. Duplicates are compared case-insensitively.)*
- What input formats does Amount accept? *(A positive number with at most 2 decimal places: `100`, `100.5`, `100.50`. No currency symbols, commas or negative numbers.)*
- Is anything persisted? *(Not in the base version. Persistence is follow-up 5.)*

## Functional requirements
- [ ] **Members:** a text field labelled `Member name` and an `Add member` button (Enter also submits).
  - Names are trimmed, and a blank name does nothing.
  - A duplicate (case-insensitive) shows `Member already exists` and isn't added.
- [ ] Until there are at least 2 members, show `Add at least two members to add expenses` instead of the expense form.
- [ ] **Expense form:**
  - `Description`: text.
  - `Amount`: text, in rupees.
  - `Paid by`: a select of the members, defaulting to the first member.
  - A `Split between` group: one checkbox per member, labelled with the member's name. All are checked by default, including members added later.
  - A split type: `Equally` (the default) or `Exact amounts`.
  - With `Exact amounts`, one text field per checked participant, labelled `Share for <name>`.
  - An `Add expense` button.
- [ ] **Validation** runs on submit. On any error, nothing is added. Messages:
  - `Description is required`
  - `Enter a valid amount`: not a positive number with at most 2 decimals
  - `Select at least one participant`
  - `Shares must add up to ₹<total>`, for example `Shares must add up to ₹900.00`: shown for exact splits when the shares aren't all valid non-negative amounts, or don't sum exactly to the total. Compare in paise.
- [ ] **After a successful add:**
  - Clear Description, Amount and the shares.
  - Check every participant again, and set the split type back to `Equally`.
  - Keep `Paid by` as it was.
- [ ] **Expenses list:**
  - Each expense shows its description, amount and `paid by <name>`, plus a `Delete <description>` button.
  - With no expenses, show `No expenses yet`.
- [ ] **Balances:** one line per member, in member order.
  - Positive balance: `<name> is owed ₹X`.
  - Negative balance: `<name> owes ₹X`.
  - Zero: `<name> is settled up`.
  - Balances are derived from the members and expenses during render, never stored.
- [ ] **Settlements:**
  - One line per payment from `simplifyDebts(balances)`: `<from> pays <to> ₹X`.
  - When there are none, show `All settled up`.
- [ ] **Deleting** an expense removes it and updates balances and settlements.
- [ ] **`simplifyDebts(balances)`**, a pure function:
  - Input: member → integer paise. It throws a `RangeError` if any value isn't an integer, or if the values don't sum to 0.
  - Returns `{ from, to, amount }[]`. `from` had a negative balance, `to` a positive one, and `amount` is a positive integer.
  - Applying every settlement brings every balance to exactly 0.
  - At most (non-zero members − 1) settlements. Members with a 0 balance never appear. No member appears as both a payer and a receiver.
  - The same input always gives the same output. Don't depend on object key order for tie-breaks: sort by name.
  - Don't mutate the input.
- [ ] **Formatting:** amounts are shown as the currency symbol followed by rupees with exactly 2 decimals, for example `₹33.34` or `₹0.15`. Grouping separators for thousands are up to you.

## Non-functional requirements
- **Accessibility:**
  - Every field has a visible `<label>`.
  - The checkboxes and the split-type radios are grouped in `<fieldset>`s with `<legend>`s (`Split between`, `Split type`).
  - Validation messages are linked to their fields with `aria-describedby`, or shown in a `role="alert"` summary. After a failed submit, move focus to the first invalid field.
  - Balances, expenses and settlements are real lists with accessible names (`aria-label`).
- **Keyboard:** everything works with Tab, Space (checkboxes and radios), arrow keys (radio group) and Enter (submits the form you're in).
- **Correctness:**
  - No floating-point arithmetic on money: parse `"100.50"` into `10050` using string or integer math.
  - The sum of all balances is always exactly 0.
- **Architecture:** keep the money helpers (`parseAmount`, `formatAmount`, `splitEqually`) and `simplifyDebts` as pure functions outside the component, so they can be unit-tested.
- **UX states:** fewer than 2 members, no expenses, all settled.

## Constraints
- 80 minutes. React and CSS Modules only. No money or math libraries.
- Keep the public types in `types.ts` unchanged. Export `simplifyDebts` as a named export alongside the default component.

## Data / API contract
```ts
type Balances = Record<string, number>;               // member name → paise; + is owed, − owes
interface Settlement { from: string; to: string; amount: number }   // amount in paise, > 0

interface ExpenseSplitterProps {
  currencySymbol?: string;   // default "₹"
  storageKey?: string;       // follow-up 5
}

// Solution.tsx
export function simplifyDebts(balances: Balances): Settlement[];
export default function ExpenseSplitter(props: ExpenseSplitterProps): JSX.Element;
```
A suggested internal model is `Expense { id; description; amount; paidBy; shares: Record<member, paise> }`. Store the resolved shares, not the split type, so balances are just sums.

## Test contract
- Member form: a textbox labelled `Member name` and a button named `Add member`. The texts `Member already exists` and `Add at least two members to add expenses` appear exactly as written.
- Expense form fields (by label): `Description`, `Amount`, `Paid by` (a `combobox`, i.e. `<select>`), checkboxes named after each member, radios named `Equally` and `Exact amounts`, and textboxes labelled `Share for <name>`. The submit button is named `Add expense`.
- Validation texts: `Description is required`, `Enter a valid amount`, `Select at least one participant`, `Shares must add up to ₹<total>`.
- Lists are found by accessible name: `list` named `Expenses`, `Balances` and `Settlements`. Tests compare each `listitem`'s whitespace-normalized text, so nested markup is fine.
- Balance lines are exactly `<name> is owed ₹X`, `<name> owes ₹X` or `<name> is settled up`. Settlement lines are exactly `<from> pays <to> ₹X`.
- `No expenses yet` and `All settled up` appear when those lists are empty. The `Settlements` list may be absent then.
- Each expense has a button named `Delete <description>`.
- Tests only use amounts below ₹1,000, so thousands separators never matter.
- `simplifyDebts` tests check its properties (balances zeroed, count bound, no one both pays and receives), not an exact list, except for trivially unique cases.

## Edge cases
- ₹0.10 + ₹0.20 must be exactly ₹0.30 (`0.1 + 0.2 !== 0.3` in JavaScript).
- ₹0.01 split among 3 people: one person owes 1 paisa and the rest owe 0.
- The payer isn't among the participants.
- Only one participant, who is also the payer: every balance stays 0.
- Exact shares of `0` for some participants.
- Amounts like `1.`, `.5`, `1e3`, ` 12 ` (with spaces): decide, and be consistent. *(Assume a trimmed `12` is valid, and the others are invalid.)*
- Two expenses with the same description: deleting one must not delete both (use ids).
- Adding a member after expenses exist: they start settled up.

## Follow-ups
1. **Percentage and shares splits.** Add `By percentage` (must total 100%) and `By shares` (for example 2 : 1 : 1). Both go through the same deterministic paise rounding. How do you generalize `splitEqually` into one weighted splitter?
2. **Multiple currencies.** Each expense has a currency (INR, USD, EUR), and a rate table converts to the group's base currency. Where do you round, and how do you stop repeated conversion from drifting?
3. **Groups.** Members can belong to several groups ("Goa trip", "Flatmates"), each with its own expenses. Show a per-group view and an overall "you owe / you are owed" total across groups.
4. **Settle-up records.** Each settlement line gets a `Record payment` button that adds a payment entry (not an expense), which moves the balances. Payments can be deleted like expenses.
5. **Persist to localStorage.** When `storageKey` is passed, save members and expenses to `localStorage[storageKey]` and restore them on mount. Add a `version` field and explain how you'd migrate the old data when the shape changes.

## Concepts covered
Integer money in minor units · deterministic rounding and remainder allocation · derived state (balances from expenses) · pure domain functions tested without React · the greedy debt-simplification algorithm and its limits · form validation with fieldsets and radio/checkbox groups.

Related: S17 Product Cart (money and derived totals) · S21 Users Directory CRUD (form validation) · J25 Hooks pack (useLocalStorage).
