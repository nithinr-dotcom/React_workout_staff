import type { StopwatchCountdownProps } from "./types";
import styles from "./Solution.module.css";
import { useEffect, useId, useRef, useState } from "react";

// ---------- helpers ----------

const pad = (n: number, len = 2) => String(n).padStart(len, "0");

/** 1234 → "00:01.234" (stopwatch: floor, ms precision) */
function formatMs(ms: number) {
  const total = Math.floor(ms);
  const m = Math.floor(total / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  return `${pad(m)}:${pad(s)}.${pad(total % 1000, 3)}`;
}

/** 2400 → "00:03" (countdown: round UP, so 00:00 only appears at the very end) */
function formatCountdown(ms: number) {
  const secs = Math.ceil(ms / 1000);
  return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`;
}

/**
 * Always holds the LATEST value of a prop. Interval callbacks are created once,
 * so they'd otherwise keep calling the `now` / `onComplete` from the first render.
 */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

// ---------- component ----------

export default function StopwatchCountdown({
  now = () => performance.now(),
  onCountdownComplete,
}: StopwatchCountdownProps) {
  return (
    <div className={styles.root}>
      <Stopwatch now={now} />
      <Countdown now={now} onComplete={onCountdownComplete} />
    </div>
  );
}

// ---------- stopwatch ----------

function Stopwatch({ now }: { now: () => number }) {
  const headingId = useId();
  const nowRef = useLatest(now);

  const [running, setRunning] = useState(false);
  // Time from all PREVIOUS runs (before the last Start). Changes only on Stop/Reset.
  const [accumulated, setAccumulated] = useState(0);
  // What the display shows. The interval only refreshes this, it never adds to it.
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<{ n: number; split: number }[]>([]);

  // Refs: timing data that changes without needing a re-render.
  const startedAtRef = useRef(0); // clock value at the last Start
  const lastLapAtRef = useRef(0); // total elapsed at the previous lap

  // 1. THE KEY IDEA: elapsed = previous runs + (clock now − clock at Start).
  //    Computed from the clock every time, never by counting ticks, so a late or
  //    throttled interval can't make the time drift.
  const currentTotal = () => accumulated + (nowRef.current() - startedAtRef.current);

  // 2. While running, re-render every 30ms by reading the clock again.
  //    The cleanup clears the interval on Stop and on unmount.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed(accumulated + (nowRef.current() - startedAtRef.current));
    }, 30);
    return () => clearInterval(id);
  }, [running, accumulated, nowRef]);

  const start = () => {
    startedAtRef.current = now();
    setRunning(true);
  };

  const stop = () => {
    const total = currentTotal();
    setAccumulated(total); // freeze: the next Start continues from here
    setElapsed(total);
    setRunning(false);
  };

  const lap = () => {
    const total = currentTotal();
    const split = total - lastLapAtRef.current; // time since the previous lap
    lastLapAtRef.current = total;
    setLaps((prev) => [{ n: prev.length + 1, split }, ...prev]); // newest first
  };

  const reset = () => {
    setAccumulated(0);
    setElapsed(0);
    setLaps([]);
    lastLapAtRef.current = 0;
  };

  return (
    // A <section> with an accessible name gets the "region" role.
    <section aria-labelledby={headingId} className={styles.section}>
      <h2 id={headingId} className={styles.heading}>
        Stopwatch
      </h2>
      <div role="timer" className={styles.display}>
        {formatMs(elapsed)}
      </div>
      <div className={styles.buttons}>
        {running ? (
          <button type="button" onClick={stop}>
            Stop
          </button>
        ) : (
          <button type="button" onClick={start}>
            Start
          </button>
        )}
        <button type="button" onClick={lap} disabled={!running}>
          Lap
        </button>
        <button type="button" onClick={reset} disabled={running || elapsed === 0}>
          Reset
        </button>
      </div>
      <ol aria-label="Laps" className={styles.laps}>
        {laps.map((l) => (
          <li key={l.n}>
            <span>Lap {l.n}</span> <span className={styles.lapTime}>{formatMs(l.split)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

// ---------- countdown ----------

type CountdownStatus = "idle" | "running" | "paused" | "done";

/** "" → "", "75" → "59", "-3" → "0". Never produces NaN. */
function clampInput(raw: string, max: number) {
  if (raw === "") return "";
  const n = Math.floor(Number(raw));
  if (Number.isNaN(n)) return "";
  return String(Math.min(max, Math.max(0, n)));
}

function Countdown({ now, onComplete }: { now: () => number; onComplete?: () => void }) {
  const headingId = useId();
  const minutesId = useId();
  const secondsId = useId();
  const nowRef = useLatest(now);
  const onCompleteRef = useLatest(onComplete);

  const [minutes, setMinutes] = useState("1");
  const [seconds, setSeconds] = useState("0");
  const [status, setStatus] = useState<CountdownStatus>("idle");
  const [remaining, setRemaining] = useState(0);
  const endAtRef = useRef(0); // clock value when the countdown will hit zero

  // An empty input counts as 0.
  const durationMs = ((Number(minutes) || 0) * 60 + (Number(seconds) || 0)) * 1000;

  // 3. Same idea as the stopwatch: remaining = end time − clock now.
  //    The interval just re-reads the clock. When it hits zero we stop and fire
  //    onComplete. That runs once because clearing the interval stops further ticks.
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      const left = Math.max(0, endAtRef.current - nowRef.current());
      setRemaining(left);
      if (left === 0) {
        clearInterval(id);
        setStatus("done");
        onCompleteRef.current?.();
      }
    }, 100);
    return () => clearInterval(id);
  }, [status, nowRef, onCompleteRef]);

  const start = () => {
    // Paused → resume from what's left. Idle/done → start from the entered duration.
    const from = status === "paused" ? remaining : durationMs;
    endAtRef.current = now() + from;
    setRemaining(from);
    setStatus("running");
  };

  const pause = () => {
    setRemaining(Math.max(0, endAtRef.current - now()));
    setStatus("paused");
  };

  const reset = () => {
    setStatus("idle");
    setRemaining(durationMs);
  };

  // Before the first start, show what's typed in the inputs.
  const shown = status === "idle" ? durationMs : remaining;
  const inputsLocked = status === "running" || status === "paused";
  const canStart = status === "paused" ? remaining > 0 : durationMs > 0;

  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h2 id={headingId} className={styles.heading}>
        Countdown
      </h2>
      <div className={styles.inputs}>
        <label htmlFor={minutesId}>Minutes</label>
        <input
          id={minutesId}
          type="number"
          min={0}
          max={99}
          value={minutes}
          disabled={inputsLocked}
          onChange={(e) => setMinutes(clampInput(e.target.value, 99))}
        />
        <label htmlFor={secondsId}>Seconds</label>
        <input
          id={secondsId}
          type="number"
          min={0}
          max={59}
          value={seconds}
          disabled={inputsLocked}
          onChange={(e) => setSeconds(clampInput(e.target.value, 59))}
        />
      </div>
      <div role="timer" className={styles.display}>
        {formatCountdown(shown)}
      </div>
      <div className={styles.buttons}>
        {status === "running" ? (
          <button type="button" onClick={pause}>
            Pause
          </button>
        ) : (
          <button type="button" onClick={start} disabled={!canStart}>
            Start
          </button>
        )}
        <button type="button" onClick={reset}>
          Reset
        </button>
      </div>
      {status === "done" && (
        <p role="alert" className={styles.done}>
          Time's up!
        </p>
      )}
    </section>
  );
}
