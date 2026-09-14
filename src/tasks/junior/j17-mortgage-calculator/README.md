# Mortgage Calculator

## Problem statement
Build a `MortgageCalculator`, the kind of widget you see on a bank or real-estate site. The user enters a loan amount, an annual interest rate and a loan term in years, then presses **Calculate**. If every input is valid, show:
- the **monthly payment**
- the **total payment** over the life of the loan
- the **total interest**

All three are formatted as currency with `Intl.NumberFormat`. Invalid inputs show a specific error message next to the field.

The monthly payment for a fixed-rate loan is:

```
M = P · r · (1 + r)^n / ((1 + r)^n − 1)
```

where `P` is the loan amount, `r` is the **monthly** interest rate as a fraction (annual % ÷ 12 ÷ 100) and `n` is the number of **monthly** payments. When the rate is 0 the formula divides by zero, so handle that case separately.

## Clarifying questions to ask
- Calculate live as the user types, or on submit? *(On submit with a `Calculate` button. Live updating is a follow-up.)*
- Are the fields prefilled? *(Yes: `300000`, `5` and `30`. No results are shown until the first Calculate.)*
- Which currency and locale? *(Props, defaulting to `USD` and `en-US`.)*
- Is 0% interest allowed? *(Yes. The monthly payment is then simply `P / n`.)*
- Are fractional years allowed? *(No. The term is a whole number of years from 1 to 50.)*
- Rounding? *(Compute totals from the unrounded monthly payment. Round only when formatting to 2 decimal places.)*

## Functional requirements
- [ ] Three labelled inputs: `Loan amount`, `Annual interest rate (%)` and `Loan term (years)`, prefilled with `300000`, `5` and `30`.
- [ ] A `Calculate` button submits the form. Pressing `Enter` in a field also submits.
- [ ] Validate on submit:
  - Loan amount must be a number greater than 0. Otherwise show `Enter a loan amount greater than 0`.
  - Interest rate must be a number from 0 to 100 inclusive. Otherwise show `Enter an interest rate between 0 and 100`.
  - Loan term must be a whole number from 1 to 50 inclusive. Otherwise show `Enter a loan term between 1 and 50 years`.
  - Empty fields are invalid.
- [ ] Show every failing field's message at once. Hide any previous results while there are errors.
- [ ] With valid inputs, clear all errors and show the monthly payment, total payment (`monthly × n`) and total interest (`total payment − P`).
- [ ] Format results with `Intl.NumberFormat(locale, { style: 'currency', currency })`.

## Non-functional requirements
- **Accessibility:**
  - Every input has a visible `<label>`.
  - An invalid input has `aria-invalid="true"` and its error message is linked with `aria-describedby`.
  - After a failed submit, move focus to the first invalid field.
  - Results appear in a polite live region (for example `<output>` or `role="status"`) so the new numbers are announced.
- **Keyboard:** plain form behaviour: `Tab` between fields, `Enter` submits.
- **Correctness:** don't store derived results as separate state that can go stale. Keep the numeric logic in a pure function you could unit-test.
- **UX:** use `inputMode="decimal"` (or `type="number"`) for mobile keyboards, and show results in a readable summary card.

## Constraints
- 35 minutes. React and CSS Modules only. No finance or formatting libraries.
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface MortgageCalculatorProps {
  currency?: string; // default 'USD'
  locale?: string;   // default 'en-US'
}

interface MortgageResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Inputs are found with `getByLabelText('Loan amount')`, `getByLabelText('Annual interest rate (%)')` and `getByLabelText('Loan term (years)')`.
- A `button` named `Calculate`.
- Results are checked by their formatted text, for example `$1,610.46`, `$579,767.35` and `$279,767.35` for 300000 at 5% over 30 years. Each value must be its own text node or element, so `getByText('$1,610.46')` matches.
- Error messages are the exact strings above. Tests check that the input's accessible description contains the message (`toHaveAccessibleDescription`), and check `aria-invalid="true"`.

## Edge cases
- 0% interest: 120000 over 10 years is `$1,000.00` a month with `$0.00` interest.
- Input like `1e5`, `  250000  ` or `-0`: decide what's valid and say so.
- A very high rate (100%) with a long term: `(1 + r)^n` gets large. Check you don't show `NaN` or `Infinity`.
- Fixing one field while another is still invalid: only the invalid field keeps its error.

## Follow-ups
1. **Live results.** Recalculate as the user types, without Calculate. Only show an error for a field after it has been blurred once, so users don't see errors while still typing.
2. **Amortisation schedule.** Show a table with one row per year: principal paid, interest paid and remaining balance. The final balance must be exactly 0 even after rounding.
3. **Grouped input.** Let the amount field show thousands separators while typing (`300,000`) and keep the caret in the right place.
4. **Down payment and extra payments.** Add a down payment (amount or %) and an optional extra monthly payment. Show how many months earlier the loan is paid off.

## Concepts covered
Controlled inputs and string-to-number parsing · validation with accessible errors · keeping calculations in pure functions · `Intl.NumberFormat` for currency · floating-point rounding.

Related: J05 Signup Form with Validation · J19 Multi-step Form Wizard.
