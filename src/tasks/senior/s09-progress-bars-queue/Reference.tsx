import { useEffect, useReducer, useRef } from 'react';
import type { ProgressQueueProps } from './types';
import styles from './Reference.module.css';

interface Bar {
  id: number;
  /** Running time accumulated so far, in ms. Storing time (not percent) keeps `duration` changes sane. */
  elapsed: number;
}

interface State {
  bars: Bar[];
  nextId: number;
  paused: boolean;
}

type Action =
  | { type: 'add' }
  | { type: 'tick'; dt: number; duration: number; concurrency: number }
  | { type: 'togglePause' }
  | { type: 'reset' };

const initialState: State = { bars: [], nextId: 1, paused: false };

/**
 * Advance the queue by `dt` ms. "Running" is derived, never stored: it's the first `concurrency`
 * unfinished bars in creation order. A bar that finishes mid-tick hands its leftover time to the
 * next queued bar, so the total work done is exact regardless of tick size.
 */
function advance(bars: Bar[], dt: number, duration: number, concurrency: number): Bar[] {
  const unfinished: number[] = [];
  bars.forEach((bar, i) => {
    if (bar.elapsed < duration) unfinished.push(i);
  });
  if (unfinished.length === 0 || dt <= 0) return bars;

  const next = bars.slice();
  const lanes = unfinished.slice(0, concurrency).map((index) => ({ index, time: dt }));
  const queued = unfinished.slice(concurrency);
  let q = 0;

  while (lanes.length > 0) {
    const { index, time } = lanes.shift()!;
    const bar = next[index];
    const remaining = duration - bar.elapsed;
    if (time < remaining) {
      next[index] = { ...bar, elapsed: bar.elapsed + time };
    } else {
      next[index] = { ...bar, elapsed: duration };
      const leftover = time - remaining;
      if (leftover > 0 && q < queued.length) lanes.push({ index: queued[q++], time: leftover });
    }
  }
  return next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return { ...state, bars: [...state.bars, { id: state.nextId, elapsed: 0 }], nextId: state.nextId + 1 };
    case 'tick':
      if (state.paused) return state;
      return { ...state, bars: advance(state.bars, action.dt, action.duration, action.concurrency) };
    case 'togglePause':
      return { ...state, paused: !state.paused };
    case 'reset':
      return initialState;
  }
}

const now = () => performance.now();

export default function ProgressQueue({ duration = 2000, concurrency = 3 }: ProgressQueueProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { bars, paused } = state;
  const safeConcurrency = Math.max(1, Math.floor(concurrency));
  const hasUnfinished = bars.some((bar) => bar.elapsed < duration);
  const ticking = !paused && hasUnfinished;

  /** Timestamp of the last tick while the ticker runs, otherwise null. */
  const lastTickRef = useRef<number | null>(null);

  // One ticker for the whole component. It only exists while something can make progress.
  useEffect(() => {
    if (!ticking) return;
    lastTickRef.current = now();
    let frame = 0;
    const loop = () => {
      const t = now();
      const dt = t - (lastTickRef.current ?? t);
      lastTickRef.current = t;
      dispatch({ type: 'tick', dt, duration, concurrency: safeConcurrency });
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      lastTickRef.current = null;
    };
  }, [ticking, duration, safeConcurrency]);

  const onTogglePause = () => {
    // Credit the time since the last frame before freezing, so pausing never loses progress.
    if (!paused && lastTickRef.current !== null) {
      const t = now();
      dispatch({ type: 'tick', dt: t - lastTickRef.current, duration, concurrency: safeConcurrency });
      lastTickRef.current = t;
    }
    dispatch({ type: 'togglePause' });
  };

  let unfinishedSeen = 0;

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button type="button" className={styles.button} onClick={() => dispatch({ type: 'add' })}>
          Add
        </button>
        <button type="button" className={styles.button} onClick={onTogglePause}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button type="button" className={styles.button} onClick={() => dispatch({ type: 'reset' })}>
          Reset
        </button>
      </div>

      {bars.length === 0 ? (
        <p className={styles.empty}>No bars yet. Click Add.</p>
      ) : (
        <ul className={styles.list}>
          {bars.map((bar) => {
            const percent = Math.min(100, Math.floor((bar.elapsed / duration) * 100));
            const done = bar.elapsed >= duration;
            const queued = !done && unfinishedSeen++ >= safeConcurrency;
            const status = done ? 'Done' : queued ? 'Queued' : `${percent}%`;
            const label = `Bar ${bar.id}`;
            return (
              <li key={bar.id} className={styles.row}>
                <span className={styles.label} aria-hidden="true">
                  {label}
                </span>
                <div
                  role="progressbar"
                  aria-label={label}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  aria-valuetext={status}
                  className={`${styles.track} ${queued ? styles.queued : ''}`}
                >
                  <div
                    className={`${styles.fill} ${done ? styles.done : ''} ${paused && !done && !queued ? styles.paused : ''}`}
                    style={{ transform: `scaleX(${percent / 100})` }}
                  />
                </div>
                <span className={styles.status} aria-hidden="true">
                  {status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
