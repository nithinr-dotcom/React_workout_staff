import type { StarRatingProps } from "./types";
import styles from "./Solution.module.css";
import { useRef, useState, type KeyboardEvent } from "react";

export default function StarRating({
  max = 5,
  value,
  defaultValue = 0,
  onChange,
  readOnly = false,
  label = "Rating",
}: StarRatingProps) {
  // Keep any number inside 0..max (handles defaultValue > max, negatives, max shrinking).
  const clamp = (n: number) => Math.min(max, Math.max(0, n));

  // 1. CONTROLLED vs UNCONTROLLED.
  //    If the parent passes `value`, the parent owns the state and we only report
  //    changes through onChange. Otherwise we keep our own copy in `internal`.
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = clamp(isControlled ? value : internal);

  // 2. HOVER is a separate "display value", never the real value.
  //    null = not hovering → show the real value.
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? current;

  // 3. REFS to every star, so the keyboard handler can move focus.
  const starRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const commit = (next: number) => {
    if (readOnly) return;
    // Uncontrolled: update our own state. Controlled: the parent decides.
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  // Clicking the star that is already the value clears the rating.
  const handleClick = (n: number) => commit(n === current ? 0 : n);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, n: number) => {
    if (readOnly) return;
    let target: number;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowUp":
        target = Math.min(max, current + 1); // clamp, no wrapping
        break;
      case "ArrowLeft":
      case "ArrowDown":
        target = Math.max(1, current - 1);
        break;
      case "Home":
        target = 1;
        break;
      case "End":
        target = max;
        break;
      case " ":
        // Space SELECTS the focused star. Without this, the native button click
        // would run handleClick and clear the rating if it was already selected.
        target = n;
        break;
      default:
        return;
    }

    e.preventDefault(); // arrows/Home/End/Space would otherwise scroll the page
    commit(target);
    starRefs.current[target - 1]?.focus(); // focus follows the value
  };

  // 4. ROVING TABINDEX: only one star is a Tab stop, the checked one,
  //    or the first star when there is no rating yet.
  const tabStop = current === 0 ? 1 : current;

  return (
    // Pointer leaving the whole row → stop previewing, show the real value again.
    <div className={styles.hoverArea} onMouseLeave={() => setHovered(null)}>
      <div
        role="radiogroup"
        aria-label={label}
        aria-readonly={readOnly || undefined}
        className={`${styles.root} ${readOnly ? styles.readOnly : ""}`}
      >
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1; // stars are 1-based, the array is 0-based
          const filled = n <= display;
          return (
            <button
              key={n}
              ref={(el) => {
                starRefs.current[i] = el;
              }}
              type="button"
              // A <button> with role="radio" instead of <input type="radio">,
              // because a native radio can't be unchecked by clicking it again.
              role="radio"
              aria-checked={n === current}
              aria-label={n === 1 ? "1 star" : `${n} stars`}
              tabIndex={n === tabStop ? 0 : -1}
              className={`${styles.star} ${filled ? styles.filled : ""}`}
              onClick={() => handleClick(n)}
              onKeyDown={(e) => handleKeyDown(e, n)}
              onMouseEnter={() => !readOnly && setHovered(n)}
            >
              {/* Decorative: the aria-label already says "3 stars". */}
              <span aria-hidden="true">{filled ? "★" : "☆"}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
