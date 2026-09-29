import type { OtpInputProps } from "./types";
import styles from "./Solution.module.css";
import { useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";

const onlyDigits = (s: string) => s.replace(/\D/g, "");

// Make an array exactly `length` long: pads with "" or drops extra boxes.
// Used so a changed `length` prop never leaves us with too many / too few digits.
const resize = (arr: string[], length: number) => Array.from({ length }, (_, i) => arr[i] ?? "");

export default function OtpInput({ length = 6, onComplete, onChange, autoFocus = false, disabled = false }: OtpInputProps) {
  // 1. STATE: one string per box ("" = empty). Uncontrolled: the component owns the digits.
  const [digits, setDigits] = useState<string[]>(() => resize([], length));
  const cells = resize(digits, length);

  // 2. LATEST-VALUE REF: handlers read the newest digits from here, not from the
  //    `digits` captured when they were created. This way two very fast events
  //    (e.g. keystrokes before a re-render) never work on stale data.
  //    We don't write to the ref during render (React discourages it); instead
  //    `latest()` resizes on read, in case `length` changed since the last edit.
  const digitsRef = useRef(cells);
  const latest = () => resize(digitsRef.current, length);

  // 3. REFS to every box, so we can move focus. React calls a ref callback with
  //    null when a box is removed, so a shrinking `length` doesn't keep dead nodes.
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusBox = (index: number) => {
    const target = Math.min(length - 1, Math.max(0, index)); // clamp: no wrapping
    inputRefs.current[target]?.focus();
  };

  // autoFocus via an effect instead of the autoFocus attribute (jsx-a11y/no-autofocus
  // warns about the attribute; here the parent explicitly asked for it).
  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
  }, [autoFocus]);

  // 4. ONE PLACE that changes the code. Callbacks are called right here, in the
  //    event handler path, NOT in a useEffect watching `digits`. That keeps
  //    "one paste = one onComplete" simple and avoids double calls in StrictMode.
  const commit = (next: string[]) => {
    const prev = latest();
    if (next.every((d, i) => d === prev[i])) return; // code didn't change → no callbacks
    digitsRef.current = next;
    setDigits(next);
    onChange?.(next);
    if (next.every((d) => d !== "")) onComplete?.(next.join(""));
  };

  // Write `incoming` digits starting at box `start`; digits past the last box are dropped.
  // Used by typing, paste and OS autofill (which may put several digits into one box).
  const fillFrom = (start: number, incoming: string) => {
    const next = latest();
    const toWrite = incoming.slice(0, length - start);
    for (let k = 0; k < toWrite.length; k++) next[start + k] = toWrite[k];
    commit(next);
    // Focus the box after the last one written, or the last box.
    focusBox(start + toWrite.length);
  };

  // 5. onChange (the `input` event) handles typing. It also works for mobile keyboards
  //    that send key === "Unidentified", and for autofill that inserts the whole code.
  const handleChange = (index: number, raw: string) => {
    if (raw === "") {
      // Box emptied some other way (mobile backspace, cut): just clear it.
      const next = latest();
      next[index] = "";
      commit(next);
      return;
    }

    let incoming = onlyDigits(raw);
    // Non-digit typed: do nothing. The input is controlled, so React puts the old value back.
    if (incoming === "") return;

    // Typing into a filled box: the browser gives us old + new (e.g. "29" or "92"
    // depending on the caret). Remove the old digit once to get just the new one.
    // (This is why we don't use maxLength={1}: it would block the new keystroke.)
    const old = latest()[index];
    if (old && incoming.length === 2 && incoming.includes(old)) {
      incoming = incoming.replace(old, "");
    }

    fillFrom(index, incoming);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    switch (e.key) {
      case "Backspace": {
        // preventDefault so the browser doesn't also fire an input event.
        e.preventDefault();
        const next = latest();
        if (next[index]) {
          next[index] = ""; // filled box: clear it, focus stays
          commit(next);
        } else if (index > 0) {
          next[index - 1] = ""; // empty box: go back and clear the previous one
          commit(next);
          focusBox(index - 1);
        }
        break; // empty first box: nothing to do
      }
      case "ArrowLeft":
        e.preventDefault(); // don't move the caret, move focus instead
        focusBox(index - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        focusBox(index + 1);
        break;
      // Digits are NOT handled here on purpose: see handleChange.
    }
  };

  // 6. PASTE: read the text ourselves and stop the browser from inserting it
  //    into this one box. Strip non-digits, then spread from the focused box.
  const handlePaste = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pasted = onlyDigits(e.clipboardData.getData("text"));
    if (pasted === "") return; // nothing useful → change nothing
    fillFrom(index, pasted);
  };

  return (
    <div role="group" aria-label="One-time code" className={styles.root}>
      {cells.map((digit, i) => (
        <input
          key={i} // boxes are positional, so the index is the right key here
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text" // not type="number": that allows e, +, - and shows spinners
          inputMode="numeric" // number pad on mobile
          // Only the first box asks the OS for the SMS code; autofill then fills
          // all boxes through handleChange → fillFrom.
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Digit ${i + 1} of ${length}`}
          value={digit}
          disabled={disabled}
          className={styles.box}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={(e) => handlePaste(e, i)}
          // Select the content on focus, so typing always replaces the digit.
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
