import { useEffect, useRef, useState } from 'react';
import type { FakeClock, PausableInterval, TimerUtilitiesModule } from './types';

const box = { border: '1px solid #d0d5dd', borderRadius: 8, padding: 12, display: 'grid', gap: 8 } as const;

export default function Playground({ impl }: { impl: TimerUtilitiesModule }) {
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const say = (line: string) => setLog((l) => [`${new Date().toLocaleTimeString()}  ${line}`, ...l].slice(0, 30));
  const attempt = (fn: () => void) => {
    try {
      setError(null);
      fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // sleep
  const sleepController = useRef<AbortController | null>(null);
  const runSleep = () =>
    attempt(() => {
      sleepController.current?.abort();
      const controller = new AbortController();
      sleepController.current = controller;
      say('sleep(2000) started');
      impl.sleep(2000, { signal: controller.signal }).then(
        () => say('sleep resolved'),
        (e: Error) => say(`sleep rejected: ${e.name}`),
      );
    });

  // mySetInterval with drift readout
  const intervalId = useRef<number | null>(null);
  const [ticks, setTicks] = useState<{ n: number; drift: number } | null>(null);
  const startInterval = () =>
    attempt(() => {
      if (intervalId.current !== null) impl.myClearInterval(intervalId.current);
      const start = performance.now();
      let n = 0;
      intervalId.current = impl.mySetInterval(() => {
        n++;
        setTicks({ n, drift: Math.round(performance.now() - start - n * 250) });
        const blockUntil = performance.now() + 40; // simulate a slow callback
        while (performance.now() < blockUntil);
      }, 250);
    });
  const stopInterval = () =>
    attempt(() => {
      if (intervalId.current !== null) impl.myClearInterval(intervalId.current);
      intervalId.current = null;
    });

  // pausable
  const pausable = useRef<PausableInterval | null>(null);
  const [slide, setSlide] = useState(0);
  const startPausable = () =>
    attempt(() => {
      pausable.current?.clear();
      setSlide(0);
      pausable.current = impl.createPausableInterval(() => setSlide((s) => (s + 1) % 5), 1500);
    });

  // tracked timeouts
  const scheduleThree = () =>
    attempt(() => {
      [1000, 2000, 3000].forEach((ms) => impl.trackedSetTimeout((label: string) => say(label), ms, `tracked timeout ${ms}ms fired`));
      say('scheduled 3 tracked timeouts');
    });

  // fake clock
  const clockRef = useRef<FakeClock | null>(null);
  const [clockNow, setClockNow] = useState<number | null>(null);
  const makeClock = () =>
    attempt(() => {
      const clock = impl.createFakeClock();
      clockRef.current = clock;
      clock.setTimeout(() => say(`fake: 300ms timer at now=${clock.now()}`), 300);
      clock.setTimeout(() => {
        say(`fake: 100ms timer at now=${clock.now()}, scheduling +50ms`);
        clock.setTimeout(() => say(`fake: nested timer at now=${clock.now()}`), 50);
      }, 100);
      setClockNow(clock.now());
      say('fake clock created with timers at 100 (+50 nested) and 300');
    });
  const tick = (ms: number) =>
    attempt(() => {
      clockRef.current?.tick(ms);
      setClockNow(clockRef.current?.now() ?? null);
    });

  useEffect(
    () => () => {
      sleepController.current?.abort();
      try {
        if (intervalId.current !== null) impl.myClearInterval(intervalId.current);
        pausable.current?.clear();
        impl.clearAllTimeouts();
      } catch {
        // not implemented yet
      }
    },
    [impl],
  );

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 720 }}>
      <section style={box}>
        <strong>sleep(2000, {'{ signal }'})</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={runSleep}>Start</button>
          <button onClick={() => sleepController.current?.abort()}>Abort</button>
        </div>
      </section>
      <section style={box}>
        <strong>mySetInterval(fn, 250) with a 40ms blocking callback</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={startInterval}>Start</button>
          <button onClick={stopInterval}>myClearInterval</button>
        </div>
        <span>{ticks ? `tick #${ticks.n}, drift from n × 250ms: ${ticks.drift}ms` : 'Not running.'}</span>
      </section>
      <section style={box}>
        <strong>createPausableInterval: slideshow, 1500ms per slide</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={startPausable}>Start</button>
          <button onClick={() => attempt(() => pausable.current?.pause())}>pause</button>
          <button onClick={() => attempt(() => pausable.current?.resume())}>resume</button>
          <button onClick={() => attempt(() => pausable.current?.clear())}>clear</button>
        </div>
        <span>Slide {slide + 1} / 5</span>
      </section>
      <section style={box}>
        <strong>trackedSetTimeout / clearAllTimeouts</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={scheduleThree}>Schedule 1s, 2s, 3s</button>
          <button
            onClick={() =>
              attempt(() => {
                impl.clearAllTimeouts();
                say('clearAllTimeouts()');
              })
            }
          >
            clearAllTimeouts
          </button>
        </div>
      </section>
      <section style={box}>
        <strong>createFakeClock</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={makeClock}>New clock</button>
          <button onClick={() => tick(50)} disabled={clockNow === null}>
            tick(50)
          </button>
          <button onClick={() => tick(200)} disabled={clockNow === null}>
            tick(200)
          </button>
        </div>
        <span>now() = {clockNow ?? '—'}</span>
      </section>
      {error && <p style={{ color: '#b91c1c', margin: 0 }}>Error: {error}</p>}
      <ol style={{ fontFamily: 'monospace', fontSize: 13, margin: 0 }}>
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
