# Progress Bar

## Problem statement
Build a `ProgressBar` component for things like file uploads and onboarding checklists. It takes a percentage and a label. It draws a track with a filled portion, shows the percentage as text, and animates smoothly when the value changes. Screen reader users must get the same information.

The parent may pass bad values (for example `-5`, `130` or `NaN` from a division by zero), so the component must be defensive.

## Clarifying questions to ask
- What range is `value` in? *(0–100. Clamp anything outside it.)*
- Should the text be rounded? *(Yes, the visible text is a whole percentage. The ARIA value is the clamped value.)*
- Is the label visible? *(Yes, above the bar, and it's also the progress bar's accessible name.)*
- Should it animate? *(Yes, a short transition when the value changes, turned off for users who prefer reduced motion.)*

## Functional requirements
- [ ] Render the `label` text and a track with a fill whose visual size represents the clamped value.
- [ ] Clamp `value` to `[0, 100]`. `NaN` (and other non-finite values) count as `0`.
- [ ] When `showValue` is true (the default), show the percentage rounded to the nearest whole number, like `42%`.
- [ ] When `showValue` is false, hide the percentage text. The ARIA attributes stay.
- [ ] Changing `value` animates the fill from the old size to the new one.
- [ ] At `100` the bar shows a "complete" style (for example a green fill).

## Non-functional requirements
- **Accessibility:** follow the [ARIA `progressbar` role](https://www.w3.org/TR/wai-aria-1.2/#progressbar).
  - Use `role="progressbar"` with `aria-valuemin="0"`, `aria-valuemax="100"` and `aria-valuenow`.
  - Give it an accessible name from the visible label (`aria-labelledby` is better than duplicating the text in `aria-label`).
  - The percentage text is presentation only, so screen readers shouldn't hear "42%" twice. `aria-hidden` on it is fine.
  - You may use the native `<progress>` element, but explain its styling tradeoffs.
- **Keyboard:** not interactive; there's no keyboard behaviour.
- **Performance:** animating `width` triggers layout on every frame. Animating `transform: scaleX()` only needs compositing. Pick one and be ready to justify it.
- **Motion:** respect `@media (prefers-reduced-motion: reduce)`.

## Constraints
- 30 minutes. React and CSS Modules only.
- Keep the public types in `types.ts` unchanged, because the tests and Playground depend on them.

## Data / API contract
```ts
interface ProgressBarProps {
  value: number;            // clamped to 0–100, NaN → 0
  label: string;            // visible label + accessible name
  showValue?: boolean;      // default true
  indeterminate?: boolean;  // follow-up 1, default false
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Exactly one element with role `progressbar`, whose accessible name is the `label`.
- It has `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-valuenow` equal to the clamped value as a string (tests only use whole numbers, e.g. `"42"`, `"0"`, `"100"`).
- The label text is visible (`getByText(label)`).
- With `showValue` on, the rounded percentage text is visible, e.g. `getByText('34%')` for `33.6`. With `showValue={false}`, `queryByText('42%')` is `null`.
- Tests don't inspect styles or widths.
- Follow-up 1: with `indeterminate`, the `progressbar` has **no** `aria-valuenow` attribute, and no percentage text is shown.

## Edge cases
- `value` is `-10`, `150`, `NaN` or `Infinity`.
- `value` changing quickly (every animation frame during an upload): the transition shouldn't lag far behind.
- A very long label on a narrow screen.
- Two progress bars on the page must not share `id`s. Use `useId`.

## Follow-ups
1. **Indeterminate.** With `indeterminate`, show a looping animated stripe instead of a fill. Leave out `aria-valuenow` (that is how ARIA signals "unknown") and hide the percentage.
2. **Custom range and value text.** Support `min`, `max` and `formatValue(value) => string` (for example `"3 of 8 steps"`), and expose that text with `aria-valuetext`.
3. **Progress bars queue.** Build the classic GreatFrontEnd variant: an "Add" button appends a bar that fills from 0 to 100 over 2 seconds. At most 3 bars fill at once; the rest wait in a queue.
4. **Pause and resume.** For the queue in follow-up 3, add a Pause/Resume button that freezes every filling bar exactly where it is and resumes from there, without drift.

## Concepts covered
The `progressbar` role · deriving display values from props (clamp, round) without extra state · CSS transitions · compositor-friendly animation · `prefers-reduced-motion` · `useId`.

Related: J07 Stopwatch & Countdown (timing) · J12 Image Carousel · J22 Job Board (loading states).
