# Flight Booker

## Problem statement
Build the classic **Flight Booker** from the [7GUIs](https://eugenkiss.github.io/7guis/tasks#flight) benchmark. A small form lets the user choose between a **one-way** and a **return** flight, pick a departure date and, for return flights, a return date. It then books the flight.

The interesting parts are the rules between fields: the return date only matters for return flights, it can't be before the departure date, and nothing can be in the past. The Book button must reflect all of that at every moment. `today` is injected so the behaviour is testable.

## Clarifying questions to ask
- What are the initial values? *(One-way flight, with departure and return both set to `today`.)*
- Date input or text input? *(Native `<input type="date">`, whose value is always `YYYY-MM-DD` or `''`. Text parsing is a follow-up.)*
- When do errors appear? *(Immediately, as soon as a value is invalid. With only three fields, live validation is fine.)*
- Can the return date be the same day as departure? *(Yes. Only strictly earlier is invalid.)*
- Is booking a real request? *(No. Show a confirmation message.)*
- What happens to the return date when switching back to one-way? *(Keep its value, but disable the field and ignore it for validation.)*

## Functional requirements
- [ ] A select labelled `Flight type` with the options `One-way flight` and `Return flight`, defaulting to one-way.
- [ ] A date input labelled `Departure date` and a date input labelled `Return date`. Both start at `today`.
- [ ] The return date input is `disabled` while the flight type is one-way.
- [ ] Validation, derived from the current values. For each field, show the first message that applies:
  - Departure empty: `Enter a departure date`
  - Departure before `today`: `Departure date cannot be in the past`
  - Return empty (return flight only): `Enter a return date`
  - Return before departure (return flight only): `Return date cannot be before departure date`
  - Return before `today` (return flight only): `Return date cannot be in the past`
- [ ] Errors for the return date are never shown while the flight type is one-way.
- [ ] A `Book` button submits the form. It is disabled while any shown error exists.
- [ ] Submitting shows a confirmation, with dates exactly as `YYYY-MM-DD`:
  - one-way: `You have booked a one-way flight on 2026-09-20.`
  - return: `You have booked a return flight departing on 2026-09-20 and returning on 2026-09-25.`
- [ ] Changing any field after booking hides the confirmation.
- [ ] Without a `today` prop, use the device's **local** date. Watch out: `new Date().toISOString().slice(0, 10)` is the UTC date.

## Non-functional requirements
- **Accessibility:**
  - A real `<form>` with `<label>`s for every control.
  - Each error message is linked to its input with `aria-describedby`, and the input gets `aria-invalid="true"`.
  - The confirmation appears in a polite live region (`role="status"`).
  - Use the native `disabled` attribute, not only styling.
- **Keyboard:** plain form behaviour. `Enter` in a date field submits when valid.
- **Correctness:**
  - Don't store `isValid` or error strings in state. Derive them from the three values and `today` during render.
  - Compare dates without going through `new Date('YYYY-MM-DD')`, which parses as UTC midnight.
- **UX:** error text in red directly under its field. The disabled return field is visibly greyed out.

## Constraints
- 35 minutes. React and CSS Modules only. No date or form libraries.
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
type FlightType = 'one-way' | 'return';

interface FlightBookerProps {
  today?: string; // 'YYYY-MM-DD', local; default: the device's local date
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- A `combobox` named `Flight type`, with `option`s named `One-way flight` and `Return flight`. Tests use `user.selectOptions(select, 'Return flight')`.
- Date inputs found with `getByLabelText('Departure date')` and `getByLabelText('Return date')`. Tests set values with `fireEvent.change(input, { target: { value: '2026-09-20' } })` and read them with `toHaveValue('2026-09-20')`.
- A `button` named `Book`, checked with `toBeDisabled()` / `toBeEnabled()`.
- Errors are the exact strings above. Tests check `aria-invalid="true"` and that the input's accessible description contains the message.
- The confirmation is found with `getByText(<exact sentence>)`.
- Tests pass `today="2026-09-14"`. One test omits it and uses a faked `Date` near midnight to check the local-date default.

## Edge cases
- Return date equal to departure date is valid.
- Changing the departure date to after the return date makes the *return* field invalid, not the departure field.
- Switching to one-way while the return date is invalid immediately re-enables Book.
- Clearing a date input (value `''`).
- Month and year boundaries: `2026-12-31` → `2027-01-01`. Comparing `YYYY-MM-DD` strings works, but explain why.
- The device clock is just after local midnight in a UTC+ time zone: the UTC date is still yesterday.

## Follow-ups
1. **Text dates.** Replace the date inputs with text inputs in `DD.MM.YYYY` format, as in the original 7GUIs spec. Show `Enter a valid date (DD.MM.YYYY)` for malformed or impossible dates such as `31.02.2026`.
2. **min and max.** Set `min` on both date inputs, so the departure picker can't select past days and the return picker can't select days before departure. Explain why you still need JavaScript validation.
3. **Time zones.** The airline works in the departure airport's time zone, not the user's. Explain what `new Date('2024-01-01')` returns in New York vs Tokyo, and how you would model "a calendar date" safely.
4. **Booking request.** Make Book call an async `onBook(booking)` that can fail. Show a pending state, prevent double submission, and keep the form editable after an error.

## Concepts covered
Controlled select and date inputs · cross-field validation derived during render · disabled states · accessible inline errors (`aria-invalid`, `aria-describedby`) · calendar dates as `YYYY-MM-DD` strings · local vs UTC dates.

Related: J05 Signup Form with Validation · J17 Mortgage Calculator · S14 Date Picker · J19 Multi-step Form Wizard.
