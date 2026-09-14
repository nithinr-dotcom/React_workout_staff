# Grid Lights

## Problem statement
Build a `GridLights` component. It renders a grid of lights from a `config` matrix: `1` is a light and `0` is an empty gap. The default is a 3×3 grid with no centre light. Clicking a light turns it on. When the **last** light turns on, the grid switches the lights off automatically, one at a time, in the **reverse order** they were turned on, one every `interval` ms. The player can't interact with the grid until every light is off again.

## Clarifying questions to ask
- Can the player turn a light off by clicking it again? *(No. Clicking a light that's on does nothing.)*
- When does the first light go off? *(`interval` ms after the last light turns on. After that, one more every `interval` ms.)*
- Can the player click during the switch-off sequence? *(No. Every light is disabled until the sequence finishes.)*
- Does "reverse order" mean the reverse of grid order or of click order? *(Click order: the last light turned on is the first to go off.)*
- Can `config` change while the sequence is running? *(Assume it doesn't.)*

## Functional requirements
- [ ] Render one light for every `1` in `config`, and an empty, non-interactive gap for every `0`, keeping the grid shape.
- [ ] `config` defaults to `[[1, 1, 1], [1, 0, 1], [1, 1, 1]]`. `interval` defaults to `300`.
- [ ] Clicking a light that is off turns it on and records the order.
- [ ] Clicking a light that is already on does nothing.
- [ ] When every light is on, start switching lights off in reverse activation order. The first light goes off `interval` ms after the final click, then one more every `interval` ms.
- [ ] While lights are switching off, every light is `disabled`.
- [ ] When the last light goes off, lights are enabled again and a new round can start.
- [ ] Clear any pending timer on unmount.

## Non-functional requirements
- **Accessibility:**
  - Each light is a native `<button>` with `aria-pressed` (`true` when on) and an accessible name giving its position (see Test contract).
  - Gaps are hidden from assistive technology (no role, no name).
  - Consider a polite live region that announces "Switching off…" when the sequence starts.
- **Keyboard:**

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between lights (gaps are skipped) |
  | `Enter` / `Space` | Turn on the focused light |

- **Timers:** only one timer chain at a time. No leaked timers after unmount.
- **Styling:** a CSS Grid sized from the config. Lights that are on are clearly coloured, and the transition between states is visible.

## Constraints
- 35 minutes. React and CSS Modules only.
- No mock API.
- Keep the public types in `types.ts` unchanged.

## Data / API contract
```ts
interface GridLightsProps {
  config?: (0 | 1)[][]; // default [[1,1,1],[1,0,1],[1,1,1]]
  interval?: number;    // default 300 (ms)
}
```
Default-export the component from `Solution.tsx`.

## Test contract
- Each light is a `button` named `Row R, Column C` (1-based position in `config`, including gaps), with `aria-pressed="true"` when on and `"false"` when off.
- Gaps render no button.
- During the switch-off sequence every light `button` is `disabled`. Afterwards none are.
- Tests use fake timers and advance by `interval`.

## Edge cases
- A config with a single light: clicking it starts the sequence at once, and it goes off after `interval` ms.
- A fast double click on the last light must not start two sequences.
- Unmount mid-sequence: no errors and no timers left.
- Irregular configs, for example rows of different lengths, or a column of all gaps.

## Follow-ups
1. **Interruptible sequence.** Allow clicking during the switch-off sequence: clicking a light that is still on pauses the sequence, and the player must turn every light back on to restart it.
2. **Configurable order.** Add `order: 'reverse' | 'same' | 'random'` for the switch-off order. Inject the randomness.
3. **Arrow-key navigation.** Make the grid a single tab stop with arrow keys moving focus between lights (skipping gaps), following the APG grid pattern.
4. **Replay.** After a round, a `Replay` button turns the lights on again in the original order at `interval` ms, then switches them off as usual.

## Concepts covered
Keeping an ordered history of activations (a stack) · timers that chain and clean up · disabling input during an animation · rendering from a config matrix · `aria-pressed` toggle buttons.

Related: J06 Traffic Light · J14 Tic-Tac-Toe · J15 Memory Card Game.
