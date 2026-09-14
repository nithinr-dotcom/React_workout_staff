# Date Picker

## Problem statement
Build a `DatePicker`: a labelled read-only text input that shows the selected date, plus a "Choose date" button that opens a calendar dialog. The dialog shows one month as a grid of days, with previous/next month buttons. The user picks a day with the mouse or entirely with the keyboard, following the [WAI-ARIA Date Picker Dialog example](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/). Dates outside `min`/`max` can't be selected.

No date libraries. Everything is built on `Date` and `Intl`, which is where most of the bugs in this question hide.

## Clarifying questions to ask
- What format is `value`? *(An ISO calendar date string `yyyy-mm-dd`, or `null`. No time and no time zone.)*
- Which day does the week start on? *(Sunday. Columns are Su Mo Tu We Th Fr Sa.)*
- Can the user type a date into the input? *(Not in the base version; the input is read-only. Typing is a follow-up.)*
- Where does "today" come from? *(A `today` prop, defaulting to the real local date. Tests always pass it.)*
- Do days from the previous/next month appear in the grid? *(They may render as blank cells, but they are not selectable and have no accessible name.)*
- Is the dialog modal? *(Yes: `aria-modal`, Escape closes, focus returns to the button.)*

## Functional requirements
- [ ] Render a read-only text input labelled `label`, showing `value` as `yyyy-mm-dd` (empty when `null`), and a button named `Choose date`.
- [ ] Clicking the button opens a dialog named `Choose date`. Clicking outside the dialog closes it without changing the value.
- [ ] The dialog opens on the month of `value`; if there's no value, on the month of `today`.
- [ ] The dialog shows the month and year (e.g. `September 2026`), a `Previous month` button, a `Next month` button, and a grid of the days of that month, in weeks starting on Sunday, with weekday column headers.
- [ ] On open, focus moves to the selected day; if there's none, to today; if that isn't in the month shown, to the 1st.
- [ ] Today's cell is marked with `aria-current="date"`. The selected day's cell is marked `aria-selected="true"`.
- [ ] Clicking a day selects it: call `onChange` with its ISO string, close the dialog, and return focus to the `Choose date` button.
- [ ] `Previous month` / `Next month` change the displayed month (focus stays on the clicked button).
- [ ] Keyboard navigation inside the grid follows the table below. Moving focus to a day in another month switches the displayed month.
- [ ] `PageUp`/`PageDown` keep the day of month, clamped to the last day of the target month (31 Jan → 28 Feb).
- [ ] Days before `min` or after `max` are marked `aria-disabled="true"` and can't be selected by click, `Enter` or `Space`. Keyboard focus may still land on them.
- [ ] `Escape` closes the dialog without calling `onChange` and returns focus to the button.

## Non-functional requirements
- **Accessibility:**
  - Dialog: `role="dialog"`, `aria-modal="true"`, labelled `Choose date`. Tab cycles among the month buttons and the grid (focus trap), like S01.
  - The month/year heading is in a polite live region, so changing months is announced.
  - Grid: `role="grid"` labelled by the month/year heading (accessible name e.g. `September 2026`), with `columnheader`s for weekdays (abbreviated, with full names via `abbr` or `aria-label`).
  - Each day is a `gridcell` with an accessible name like `15 September 2026`, and is the focusable element. Use a roving tabindex: exactly one day has `tabIndex=0`.
- **Keyboard (focus on a day):**

  | Key | Behaviour |
  |---|---|
  | `ArrowRight` / `ArrowLeft` | Next / previous day |
  | `ArrowDown` / `ArrowUp` | Same weekday next / previous week |
  | `Home` / `End` | First (Sunday) / last (Saturday) day of the current week |
  | `PageDown` / `PageUp` | Same day next / previous month (clamped) |
  | `Shift+PageDown` / `Shift+PageUp` | Same day next / previous year (clamped, e.g. 29 Feb) |
  | `Enter` / `Space` | Select the focused day (if enabled), close, focus the button |
  | `Escape` | Close without changing the value, focus the button |
- **Correctness:** never parse `yyyy-mm-dd` with `new Date('2026-09-15')`. That is parsed as UTC midnight and shows the previous day in negative-offset time zones. Work with local `new Date(y, m, d)` or plain numbers.
- **Styling:** 7-column grid, visible focus ring on the focused day, distinct styles for today, selected and disabled.

## Constraints
- 90 minutes. React and CSS Modules only. No `date-fns`, `dayjs`, `moment`, or `<input type="date">`.
- `Intl.DateTimeFormat` is allowed. Month and weekday names are English (e.g. `September`), because the tests match them.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
type IsoDate = string; // "yyyy-mm-dd"
interface DatePickerProps {
  label: string;
  value: IsoDate | null;          // controlled
  onChange: (value: IsoDate | null) => void;
  today?: IsoDate;                // default: real local today
  min?: IsoDate;                  // inclusive
  max?: IsoDate;                  // inclusive
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- The input is a `textbox` named `label` with value `yyyy-mm-dd` or `''`.
- The trigger is a `button` named `Choose date`.
- The dialog is a `dialog` named `Choose date`. When closed, `queryByRole('dialog')` is `null`.
- The grid is a `grid` whose accessible name is the month and year in English: `September 2026`.
- Buttons `Previous month` and `Next month`.
- Each day of the displayed month is a `gridcell` named `<d> <Month> <yyyy>` with no leading zero, e.g. `5 October 2026`. Blank padding cells, if any, have no accessible name.
- Focus assertions use `toHaveFocus()` on those gridcells.
- `aria-selected="true"` on the selected day, `aria-current="date"` on today, `aria-disabled="true"` on out-of-range days.
- Tests always pass `today`. They render the component in a wrapper holding `value` in state and spy on `onChange`.

## Edge cases
- Months starting on Sunday (no leading blanks) or ending on Saturday.
- February in leap years (2028) and `Shift+PageDown` from 29 Feb 2028.
- `value` outside `min`/`max` (show it, but it isn't re-selectable).
- `min` later than `max`.
- `ArrowLeft` from the 1st of January crosses into December of the previous year.
- Time zone and DST: 2026-03-29 / 2026-10-25 in Europe, 2026-03-08 in the US. Adding `24 * 3600 * 1000` ms to a date is a bug.
- Two pickers on one page must not share ids.

## Follow-ups
1. **Typed input.** Make the input editable. Parse `yyyy-mm-dd` (and `dd/mm/yyyy`) on blur, show an inline error for invalid or out-of-range dates, and keep the calendar in sync.
2. **Disabled prev/next.** Disable `Previous month`/`Next month` when the whole target month is outside `min`/`max`, and stop keyboard navigation from leaving the allowed range.
3. **Locale.** Add a `locale` prop: localised month and weekday names via `Intl.DateTimeFormat`, and a locale-dependent first day of the week (`Intl.Locale.prototype.getWeekInfo`).
4. **Date range.** Turn it into a range picker (`start`/`end`), with hover preview between the first click and the second, as on booking sites.
5. **Positioning.** Render the calendar as a popover anchored to the input that flips above when there's no room below. Compare manual positioning, the Popover API, and CSS anchor positioning.

## Concepts covered
`Date` arithmetic with local constructors · the UTC parsing trap · building a month matrix · clamping days across months · roving tabindex in a grid · dialog focus management · `Intl.DateTimeFormat` · controlled components.

Related: S01 Modal Dialog · S13 Selectable Cells (grid) · J03 Tabs (roving focus).
