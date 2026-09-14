# Last Seen / Relative Time

## Problem statement
Recreate WhatsApp's "last seen" label. There are two parts:

1. A **pure** function `formatLastSeen(date, now)` that turns a timestamp into text such as `online`, `last seen 5 minutes ago`, `last seen yesterday at 09:10` or `last seen on 12 Mar 2024`.
2. A `<LastSeen date now? />` component that renders that text in a `<time>` element and **keeps it current** as time passes. It must not run a timer every second: a chat list can have hundreds of these.

This came up in an Amazon SDE-II frontend round. Most of the difficulty is in precise date rules and picking the right re-render schedule.

## Clarifying questions to ask
- Relative to what clock? *(An injected `now`: an argument to the function, and a `() => number` prop on the component that defaults to `Date.now`.)*
- Which time zone decides "today" and "yesterday"? *(The user's local time zone, i.e. local calendar days, not 24-hour windows.)*
- 12- or 24-hour clock? *(24-hour, zero-padded: `09:10`.)*
- What if `date` is in the future? *(Treat it as clock skew and show `online`.)*
- What if `date` is invalid? *(Return `last seen recently`, WhatsApp's fallback text.)*
- Localised month names? *(No. Use fixed English abbreviations for now. Locales are a follow-up.)*

## Functional requirements
- [ ] `formatLastSeen(date, now)` accepts a `Date`, an ISO string or epoch ms for `date`, and a `Date` or epoch ms for `now`. It applies the **first** matching rule below, where `diff = now − date`:

  | # | Condition | Output |
  |---|---|---|
  | 1 | `date` is invalid | `last seen recently` |
  | 2 | `diff < 1 minute` (including future dates) | `online` |
  | 3 | `diff < 60 minutes` | `last seen N minutes ago`, where `N` is whole minutes rounded down. Use `1 minute ago` for one. |
  | 4 | same local calendar day as `now` | `last seen today at HH:mm` |
  | 5 | the local calendar day before `now` | `last seen yesterday at HH:mm` |
  | 6 | same calendar year as `now` | `last seen on D Mon`, e.g. `on 12 Mar` or `on 5 Jan` |
  | 7 | otherwise | `last seen on D Mon YYYY`, e.g. `on 12 Mar 2024` |

  - `HH:mm` is 24-hour and zero-padded.
  - `D` is the day of the month with no padding.
  - `Mon` is one of `Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec`.
- [ ] `<LastSeen date now? />` renders the formatted text inside a `<time>` element with:
  - `dateTime` set to `date` as an ISO string (`toISOString()`)
  - `title` set to a full human-readable date and time, shown as a tooltip.
- [ ] For an invalid `date`, render `last seen recently` without a `<time>` element.
- [ ] The text stays correct while mounted:
  - `online` becomes `last seen 1 minute ago` once a minute has passed.
  - Under an hour, the minute count updates every minute.
  - `today at …` becomes `yesterday at …` right after local midnight. `yesterday at …` becomes `on D Mon` at the following midnight.
- [ ] Changing the `date` prop updates the text and the schedule immediately.

## Non-functional requirements
- **Performance:**
  - Never tick every second.
  - Under an hour, re-render about once a minute.
  - Beyond that, sleep until the next moment the text can change, i.e. the next local midnight.
  - Only one pending timer per component. Clear it on unmount and whenever `date` changes.
- **Accessibility:**
  - `<time dateTime>` gives assistive tech and crawlers the machine-readable value.
  - `title` exposes the exact time on hover.
  - Don't make the label a live region: a list of changing timestamps would be very noisy.
- **Correctness:** keep all date rules in `formatLastSeen`. The component only decides *when* to call it again.
- **UX:** muted secondary text, and `online` shown in a green accent.

## Constraints
- 40 minutes. React and CSS Modules only. No date libraries (no date-fns, dayjs or moment).
- Don't use `Intl.RelativeTimeFormat` or `toLocaleDateString` for the base version, because output can differ between runtimes (`Sep` vs `Sept`).
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
type DateInput = Date | string | number;

function formatLastSeen(date: DateInput, now: Date | number): string;

interface LastSeenProps {
  date: DateInput;
  now?: () => number; // default Date.now
}
```
Export `formatLastSeen` as a named export and the component as the default export from `Solution.tsx`.

## Test contract
- `formatLastSeen` is called directly with dates built from local-time constructors, e.g. `new Date(2026, 6, 15, 14, 30)`. Tests compare the exact strings from the table.
- Component tests use `vi.useFakeTimers()` with `vi.setSystemTime(...)`, pass `now={() => Date.now()}`, and advance time with `vi.advanceTimersByTime` inside `act`. `Date` is faked too, so reading `new Date()` or `Date.now()` directly also works.
- The text is found with `getByText('last seen 5 minutes ago')` (the whole string in one element). Its closest `<time>` ancestor-or-self has the `dateTime` attribute (`datetime` in the DOM) and a non-empty `title`.
- Live-update tests advance time by 60 seconds and expect the new text. They don't count timers.

## Edge cases
- Exactly 60 seconds is `1 minute ago`. Exactly 60 minutes falls through to rule 4 or 5.
- `now` = 00:20 and `date` = 23:50 the previous day: that is `30 minutes ago`, not `yesterday`.
- `now` = 1 Jan 00:30 and `date` = 31 Dec 23:00: `yesterday at 23:00`, even though the year differs.
- DST changes: a calendar day can be 23 or 25 hours, so "yesterday" is not `diff < 48h`.
- ISO strings without a time zone (`'2026-07-15'`) are parsed as UTC by `new Date`. Mention it; don't fix it.
- A `date` prop that changes from 2 days ago to 10 seconds ago must restart the minute ticks.

## Follow-ups
1. **Locales.** Add a `locale` prop and use `Intl.RelativeTimeFormat` and `Intl.DateTimeFormat`, e.g. `hace 5 minutos` and `12 mar`. How do you test output that depends on the runtime's ICU data?
2. **One shared ticker.** A chat list renders 500 `<LastSeen>`s. Replace 500 timers with a single shared clock, e.g. a `useNow(granularity)` hook on top of `useSyncExternalStore`. Only components whose text actually changes should re-render.
3. **Time zones and midnight.** Show "last seen" in the *viewer's* chosen time zone, not the browser's. Handle DST days and a midnight that doesn't exist. How would you test it without changing the machine's TZ?
4. **Coarser granularity.** Product asks for `last seen 2 hours ago` between 1 and 6 hours, before switching to `today at`. Update the rules and the schedule. What is the next wake-up time now?

## Concepts covered
Pure, testable formatting functions · local calendar-day arithmetic · choosing a timer schedule (next boundary instead of polling) · `useEffect` cleanup and restarting effects on prop changes · the `<time>` element · fake timers and injected clocks.

Related: J07 Stopwatch & Countdown · S14 Date Picker · ST13 i18n Library · S19 Chat UI.
