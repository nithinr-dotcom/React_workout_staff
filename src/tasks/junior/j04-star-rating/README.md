# Star Rating

## Problem statement
Build a `StarRating` input like the ones on product reviews and food-delivery apps. It shows `max` stars. Hovering previews a rating, clicking sets it, and clicking the current rating again clears it. It works uncontrolled (`defaultValue`) or controlled (`value` + `onChange`), and it has a read-only mode for showing an existing rating.

## Clarifying questions to ask
- Can a rating be removed? *(Yes. Clicking the star that matches the current value resets it to 0.)*
- Half stars? *(Not in the base version. See the follow-ups.)*
- Controlled or uncontrolled? *(Both. If `value` is passed, the parent owns it. Otherwise use `defaultValue`.)*
- What should screen readers announce? *(A group named by `label`, with one option per star: "1 star", "2 stars", and so on.)*
- Should the keyboard wrap from 5 back to 1? *(No. Clamp at 1 and `max`.)*

## Functional requirements
- [ ] Render `max` stars (default 5). Stars up to and including the current value are filled. The rest are empty.
- [ ] Hovering star N previews a rating of N: stars 1..N look filled. When the pointer leaves the component, the display goes back to the actual value. Hovering never calls `onChange`.
- [ ] Clicking star N sets the value to N and calls `onChange(N)`.
- [ ] Clicking the star equal to the current value clears it: the value becomes 0 and `onChange(0)` is called.
- [ ] **Uncontrolled:** the component keeps its own value, starting at `defaultValue` (default 0).
- [ ] **Controlled:** when `value` is provided, the display always reflects `value`. Interactions only call `onChange`.
- [ ] `readOnly`: shows the value, with no hover preview. Clicks and keys don't change anything or call `onChange`.
- [ ] Keyboard support as in the table below.

## Non-functional requirements
- **Accessibility:** use the [WAI-ARIA Radio Group pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/). Native `<input type="radio">` elements or `role="radio"` elements are both fine.
  - The container is a `radiogroup` named by `label`.
  - Each star is a `radio` named `1 star`, `2 stars`, …, `N stars`. Only the radio equal to the current value is checked.
  - Only one star is in the Tab order: the checked one, or the first star when the value is 0.
  - The star glyphs are decorative (`aria-hidden`), because the radio names carry the meaning.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `ArrowRight` / `ArrowUp` | Value + 1 (clamped to `max`), and focus follows |
  | `ArrowLeft` / `ArrowDown` | Value − 1 (clamped to 1), and focus follows |
  | `Home` / `End` | Value 1 / `max` |
  | `Space` | Select the focused star |
- **Styling:** filled stars in a warm colour, a visible focus ring, and a pointer cursor except in read-only mode.

## Constraints
- 30 minutes. React and CSS Modules only. Unicode ★ / ☆ or inline SVG are fine for the stars.

## Data / API contract
```ts
interface StarRatingProps {
  max?: number;            // default 5
  value?: number;          // controlled
  defaultValue?: number;   // default 0
  onChange?: (value: number) => void;
  readOnly?: boolean;
  label?: string;          // default "Rating"
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- `radiogroup` named by `label` (default `Rating`).
- `radio`s named exactly `1 star`, `2 stars`, … `N stars`. Tests check them with `toBeChecked()`.
- Clicking a radio changes the value. Tests click the radio elements themselves.
- Keyboard tests focus the checked radio (by clicking it) and then press arrow keys.
- In `readOnly` mode, clicking a star must not call `onChange` or change which radio is checked.

## Edge cases
- `defaultValue` greater than `max`, or negative: clamp it into `0..max`.
- The controlled parent ignores `onChange` (its `value` never changes): the display must not change after a click.
- `max` changes to a number lower than the current value.
- Hover preview in controlled mode must not call `onChange`.

## Follow-ups
1. **Half stars.** Support `step={0.5}`. Hovering or clicking the left half of a star selects N − 0.5. How do the radio names and the keyboard step change?
2. **Custom icons.** Accept a `renderIcon({ filled, index })` render prop so the same logic can draw hearts or thumbs.
3. **Form integration.** Accept a `name` prop, so the value is submitted with a native `<form>`, and support `required`.
4. **Hover label.** Show a text label for the hovered or selected value ("Terrible" … "Excellent") in a polite live region.

## Concepts covered
Controlled vs uncontrolled components · separating *display value* (hover) from *actual value* · the ARIA radio group pattern · roving tabindex · clamping.

Related: J03 Tabs · J05 Signup Form · J20 Poll Widget.
