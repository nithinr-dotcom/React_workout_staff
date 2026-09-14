# Custom Video Player Controls

## Problem statement
Build a `VideoPlayer` that wraps a native `<video>` element with your own controls, like the players on YouTube or Netflix:
- play/pause
- a seek bar that also shows how much has buffered
- mute and volume
- playback speed
- fullscreen

It also needs the usual keyboard shortcuts (`K`, `J`, `L`, arrows, `M`, `F`), which only work while the player has focus. While the video plays, the controls fade out after 3 seconds without mouse or keyboard activity.

The core idea is that the **media element is the source of truth**. The video can pause on its own (it ended, a headset was unplugged, the OS media keys were pressed), so your UI must follow the element's events (`play`, `pause`, `timeupdate`, `volumechange`, …). Don't keep a separate `isPlaying` flag that you only flip when your own button is clicked.

## Clarifying questions to ask
- Do we keep the browser's native controls? *(No. Don't set the `controls` attribute. Everything is custom.)*
- Which element goes fullscreen: the `<video>` or the wrapper? *(The wrapper, so the custom controls stay visible in fullscreen.)*
- Which keys, and when do they work? *(See the keyboard table. They only work when focus is inside the player, never globally.)*
- How is time shown? *(Each value on its own: `m:ss`, or `h:mm:ss` when that value is an hour or more, e.g. `1:02 of 1:02:05`. Before metadata loads, the duration is unknown and shows as `0:00`.)*
- Do the controls hide when paused? *(No. They only auto-hide while playing.)*
- Captions, playlists, picture-in-picture? *(Not in the base version. See the follow-ups.)*

## Functional requirements
- [ ] Render a focusable player region (named by `title`) that contains the `<video>` (with `src` and `poster`) and a controls group.
- [ ] **Play/pause:** a button named `Play` while paused and `Pause` while playing. Clicking it calls `video.play()` or `video.pause()`. Its name follows the media's `play`/`pause` events, including pauses you didn't cause.
- [ ] **Seek:** a range slider named `Seek` from 0 to the duration. It follows `timeupdate`/`loadedmetadata`/`durationchange`. Its `aria-valuetext` reads `current of duration`, e.g. `1:05 of 3:20`. Changing it sets `video.currentTime`.
- [ ] **Buffered:** a progress bar named `Buffered` showing how much of the video is buffered, as a percentage (0–100) of the duration. Update it on `progress`.
- [ ] **Mute:** a button named `Mute` or `Unmute`, reflecting `video.muted` (via `volumechange`).
- [ ] **Volume:** a range slider named `Volume` from 0 to 100 that sets `video.volume` (0–1). Dragging the volume above 0 while muted unmutes.
- [ ] **Speed:** a select named `Playback speed` with the values `0.5`, `0.75`, `1`, `1.25`, `1.5` and `2`. It sets `video.playbackRate` and follows `ratechange`.
- [ ] **Fullscreen:** a button named `Enter full screen` or `Exit full screen`. It calls `requestFullscreen()` on the player wrapper or `document.exitFullscreen()`, and its name follows `fullscreenchange`.
- [ ] Keyboard shortcuts as in the table below, only while focus is inside the player. Seeking is clamped to `[0, duration]`.
- [ ] **Auto-hide:** while playing, hide the controls after 3000ms with no pointer movement over the player and no key press inside it. Any pointer move or key press shows them again and restarts the timer. When paused, the controls are always shown.

## Non-functional requirements
- **Accessibility:**
  - The player is a `region` named by `title`, with `tabIndex={0}` so shortcuts work after clicking or tabbing to it.
  - Use native `<input type="range">` for seek and volume, with `aria-valuetext` for human-friendly values, and a native `<select>` for speed.
  - Toggle buttons change their *name* (`Play`/`Pause`). Don't combine that with `aria-pressed`.
  - Hiding the controls must never trap or lose keyboard focus. Show them whenever focus moves inside the controls.
  - `prefers-reduced-motion`: no fade animation.
- **Keyboard** (focus anywhere inside the player):

  | Key | Behaviour |
  |---|---|
  | `Space` | Toggle play/pause, only when the player region itself has focus (on a button, Space clicks the button) |
  | `K` | Toggle play/pause |
  | `J` / `L` | Seek back / forward 10 seconds |
  | `ArrowLeft` / `ArrowRight` | Seek back / forward 5 seconds, only when focus is not on a slider (sliders use arrows natively) |
  | `M` | Toggle mute |
  | `F` | Toggle fullscreen |

  Call `preventDefault` for handled keys, so Space doesn't scroll the page.
- **Performance:**
  - `timeupdate` fires about 4 times a second, so keep renders cheap.
  - Don't re-create listeners on every render.
  - Clean up the inactivity timer, and the `fullscreenchange` listener on `document`, when the component unmounts.
- **Styling:**
  - Controls overlay the bottom of the video on a gradient.
  - The seek bar shows three layers: buffered, played, and the thumb.
  - Hide the cursor while the controls are hidden.

## Constraints
- 75 minutes. React and CSS Modules only. No player libraries.
- Keep the public types in `types.ts` unchanged.
- The Playground uses a public sample video URL.

## Data / API contract
```ts
interface VideoPlayerProps {
  src: string;
  title: string;   // names the player region
  poster?: string;
}
```

## Test contract
**jsdom has no media playback.** The tests install a fake media layer on `HTMLMediaElement.prototype` before each test:
- `play()` and `pause()` are spies. `play()` sets `paused` to `false`, dispatches `play`, and returns a resolved promise. `pause()` sets `paused` to `true` and dispatches `pause`.
- `currentTime`, `volume`, `muted` and `playbackRate` are stored per element. Setting them dispatches `timeupdate`, `volumechange` or `ratechange` synchronously.
- `duration` (default `NaN`) and `buffered` (a `TimeRanges`-like object) are set by the test, which then dispatches `loadedmetadata` / `durationchange` / `progress`.
- `Element.prototype.requestFullscreen` and `document.exitFullscreen` are spies. They set `document.fullscreenElement` and dispatch a bubbling `fullscreenchange` from the element.

Queries:
- The player is a `region` named by `title`. Tests find the `<video>` with `querySelector('video')`, since video has no ARIA role.
- The controls are a `group` named `Video controls`. When hidden, `not.toBeVisible()` must pass, so use the `hidden` attribute or an **inline** style (`opacity: 0`, `visibility: hidden` or `display: none`). CSS Module classes aren't applied in jsdom.
- Buttons: `Play`/`Pause`, `Mute`/`Unmute`, `Enter full screen`/`Exit full screen`.
- `slider` named `Seek`, with `max` equal to the duration and a `step` that allows any whole second. `aria-valuetext` is like `1:05 of 3:20`. Tests seek with `fireEvent.change(slider, { target: { value: '120' } })`.
- `slider` named `Volume`, 0–100.
- `progressbar` named `Buffered`, with `aria-valuenow` as a whole-number percentage.
- `combobox` named `Playback speed`. Tests use `user.selectOptions(select, '1.5')`.
- Tests expect `requestFullscreen` to be called with the region as `this`.
- Auto-hide uses fake timers. Activity is simulated with `pointermove` and `mousemove` events on the region.

## Edge cases
- The duration is `NaN` before metadata loads, and `Infinity` for live streams. Neither may render `NaN:NaN`.
- `play()` returns a promise that can reject (autoplay policy). Catch it, and keep showing `Play`.
- Seeking with `J` at 0:03 goes to 0:00, and `L` near the end stops at the duration.
- The user presses Escape to leave fullscreen: the button name must still update (via `fullscreenchange`, not your click handler).
- Controls hide while focus is on the volume slider: they should stay visible while focus is inside them.
- Typing `k` while the speed `<select>` is focused should not also toggle playback. Decide and explain.
- The `src` prop changes: reset the time and buffered state.

## Follow-ups
1. **Captions.** Accept `tracks: { src, srclang, label }[]`, render `<track>` elements, and add a `CC` menu that switches `textTracks[i].mode` between `showing` and `disabled`. Remember the choice.
2. **Playlist with autoplay next.** Accept a list of videos. On `ended`, show an "Up next in 5s" countdown with a Cancel button, then load and play the next video. The countdown must stop cleanly if the user navigates away.
3. **Picture-in-picture.** Add a PiP button using `video.requestPictureInPicture()`. Hide it when `document.pictureInPictureEnabled` is false, and follow the `enterpictureinpicture`/`leavepictureinpicture` events.
4. **Resume where you left off.** Save the position to `localStorage` per `src`, throttled, and restore it on `loadedmetadata`. Don't restore within the last 5 seconds, and clear it on `ended`.
5. **Thumbnail preview on seek hover.** While hovering the seek bar, show a tooltip with the time under the pointer and a thumbnail from a sprite sheet (a VTT thumbnails track). How do you map pointer X to time, and how do you keep this cheap?

## Concepts covered
The `HTMLMediaElement` API and its events · the media element as the single source of truth · native range inputs with `aria-valuetext` · the Fullscreen API and `fullscreenchange` · keyboard shortcuts scoped to a focus container · inactivity timers · stubbing browser APIs that jsdom lacks.

Related: J12 Image Carousel · S01 Modal Dialog · S24 Snake.
