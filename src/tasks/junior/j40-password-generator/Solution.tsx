import type { PasswordGeneratorProps, Strength } from "./types";
import styles from "./Solution.module.css";
import { useEffect, useId, useState } from "react";

const MIN_LENGTH = 4;
const MAX_LENGTH = 32;
const COPIED_MS = 2000;

// The four character sets, in README order. `key` is used for state and the checkbox id.
const SETS = [
  { key: "upper", label: "Uppercase", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  { key: "lower", label: "Lowercase", chars: "abcdefghijklmnopqrstuvwxyz" },
  { key: "numbers", label: "Numbers", chars: "0123456789" },
  { key: "symbols", label: "Symbols", chars: "!@#$%^&*()-_=+[]{};:,.<>?" },
] as const;

type SetKey = (typeof SETS)[number]["key"];

const clampLength = (n: number) => Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, Math.round(n)));

// Pick one character using ONLY the injected random.
// Math.floor(random() * s.length) is always < s.length because random() < 1,
// and the Math.min is a safety net against a bad random that returns exactly 1.
function pick(s: string, random: () => number) {
  return s[Math.min(s.length - 1, Math.floor(random() * s.length))];
}

function generatePassword(length: number, sets: string[], random: () => number) {
  // 1. GUARANTEE COVERAGE: take one character from every selected set first...
  const chars = sets.map((s) => pick(s, random));
  // ...then fill the rest from the combined pool.
  const pool = sets.join("");
  while (chars.length < length) chars.push(pick(pool, random));

  // 2. SHUFFLE (Fisher–Yates), otherwise the password would always start
  //    with "uppercase, lowercase, digit, symbol" — a predictable pattern.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.floor(random() * (i + 1)));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

// Rate the password that is SHOWN (by the kinds of characters it really contains),
// not the current checkbox settings.
function getStrength(password: string): Strength {
  const classes = SETS.filter((set) => [...password].some((ch) => set.chars.includes(ch))).length;
  if (password.length < 8 || classes === 1) return "Weak";
  if (password.length >= 12 && classes >= 3) return "Strong";
  return "Medium";
}

const STRENGTH_SCORE: Record<Strength, number> = { Weak: 1, Medium: 2, Strong: 3 };

export default function PasswordGenerator({ random = Math.random, defaultLength = 12 }: PasswordGeneratorProps) {
  const id = useId();

  // 1. STATE: settings (controlled inputs) + the generated password.
  //    Changing the settings does NOT regenerate — only the Generate button does.
  const [length, setLength] = useState(() => clampLength(defaultLength));
  const [selected, setSelected] = useState<Record<SetKey, boolean>>({
    upper: true,
    lower: true,
    numbers: true,
    symbols: true,
  });
  const [password, setPassword] = useState("");

  // 2. "Copied!" TOKEN: 0 = hidden. Every successful copy bumps the number,
  //    so the effect below restarts the 2s timer even if "Copied!" is already showing.
  const [copyToken, setCopyToken] = useState(0);

  // 3. TIMER in an effect: React runs the cleanup when the token changes (copy again)
  //    and on unmount, so both "clear the timeout" rules come for free.
  useEffect(() => {
    if (copyToken === 0) return;
    const timer = setTimeout(() => setCopyToken(0), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copyToken]);

  // 4. DERIVED, not stored: strength is recomputed from the password on every render,
  //    so it can never get out of sync with what is shown.
  const strength = password ? getStrength(password) : null;

  const toggleSet = (key: SetKey) => {
    setSelected((prev) => {
      const checkedCount = Object.values(prev).filter(Boolean).length;
      // INVARIANT: ignore unchecking the last checked box. We ignore the click
      // instead of disabling the box, so it stays reachable with Tab.
      if (prev[key] && checkedCount === 1) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const handleGenerate = () => {
    const sets = SETS.filter((set) => selected[set.key]).map((set) => set.chars);
    setPassword(generatePassword(length, sets, random));
  };

  const handleCopy = async () => {
    try {
      // navigator.clipboard is undefined in non-secure (http) pages, so treat that as a failure too.
      if (!navigator.clipboard) throw new Error("Clipboard not available");
      await navigator.clipboard.writeText(password);
      setCopyToken((t) => t + 1);
    } catch {
      // Write failed or was denied: simply don't show "Copied!".
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.lengthRow}>
        <label htmlFor={`${id}-length`}>Length</label>
        <input
          id={`${id}-length`}
          type="range"
          min={MIN_LENGTH}
          max={MAX_LENGTH}
          step={1}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className={styles.slider}
        />
        {/* The slider already exposes its value to screen readers; this is for sighted users. */}
        <output htmlFor={`${id}-length`} className={styles.lengthValue}>
          {length}
        </output>
      </div>

      <fieldset className={styles.options}>
        <legend>Include</legend>
        {SETS.map((set) => (
          <label key={set.key} className={styles.option}>
            <input type="checkbox" checked={selected[set.key]} onChange={() => toggleSet(set.key)} />
            {set.label}
          </label>
        ))}
      </fieldset>

      <div className={styles.passwordRow}>
        <label htmlFor={`${id}-password`}>Password</label>
        <input
          id={`${id}-password`}
          type="text"
          readOnly
          value={password}
          placeholder="Click Generate"
          className={styles.password}
          spellCheck={false}
        />
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={handleGenerate}>
          Generate
        </button>
        <button type="button" className={styles.button} onClick={handleCopy} disabled={!password}>
          Copy
        </button>
        {/* The live region is always in the DOM, so the text change gets announced. */}
        <span role="status" className={styles.copied}>
          {copyToken > 0 ? "Copied!" : ""}
        </span>
      </div>

      {strength && (
        <div className={styles.strengthRow}>
          {/* role="meter" with a name, a number and a text value (aria-valuetext),
              so the rating doesn't depend on colour alone. */}
          <div
            role="meter"
            aria-label="Password strength"
            aria-valuemin={1}
            aria-valuemax={3}
            aria-valuenow={STRENGTH_SCORE[strength]}
            aria-valuetext={strength}
            className={styles.track}
          >
            <div className={`${styles.fill} ${styles[strength.toLowerCase()]}`} />
          </div>
          <span className={styles.strengthText}>{strength}</span>
        </div>
      )}
    </div>
  );
}
