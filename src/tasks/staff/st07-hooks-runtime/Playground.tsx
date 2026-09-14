import { useEffect, useRef, useState } from 'react';
import type { HooksRuntimeModule, RenderHandle, Runtime } from './types';

interface TimerOutput {
  text: string;
  increment: () => void;
  incrementThrice: () => void;
  toggle: () => void;
}

/** Builds a demo component bound to one runtime, logging every render, effect and cleanup. */
function makeTimerComponent(rt: Runtime, log: (line: string) => void) {
  return function Timer({ label }: { label: string }): TimerOutput {
    const [count, setCount] = rt.useState(0);
    const [running, setRunning] = rt.useState(false);
    const renders = rt.useRef(0);
    renders.current++;
    const parity = rt.useMemo(() => {
      log(`useMemo recomputed for count=${count}`);
      return count % 2 === 0 ? 'even' : 'odd';
    }, [count]);

    rt.useEffect(() => {
      if (!running) return;
      log('effect: start interval');
      const id = setInterval(() => setCount((c) => c + 1), 1000);
      return () => {
        log('cleanup: clear interval');
        clearInterval(id);
      };
    }, [running]);

    log(`render #${renders.current} (count=${count})`);
    return {
      text: `${label}: ${count} (${parity}) · render #${renders.current} · ${running ? 'running' : 'stopped'}`,
      increment: () => setCount((c) => c + 1),
      incrementThrice: () => {
        setCount((c) => c + 1);
        setCount((c) => c + 1);
        setCount((c) => c + 1);
      },
      toggle: () => setRunning((r) => !r),
    };
  };
}

export default function Playground({ impl }: { impl: HooksRuntimeModule }) {
  const [output, setOutput] = useState<TimerOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const rtRef = useRef<Runtime | null>(null);
  const handleRef = useRef<RenderHandle<{ label: string }, TimerOutput> | null>(null);

  useEffect(() => {
    const append = (line: string) => setLog((l) => [line, ...l].slice(0, 20));
    try {
      const rt = impl.createRuntime();
      const handle = rt.render(makeTimerComponent(rt, append), { label: 'Timer' });
      rtRef.current = rt;
      handleRef.current = handle;
      setOutput(handle.getOutput());
      // Poll the runtime output so interval-driven updates show up in React.
      const id = setInterval(() => setOutput(handle.getOutput()), 250);
      return () => {
        clearInterval(id);
        handle.unmount();
      };
    } catch (e) {
      setError((e as Error).message);
    }
  }, [impl]);

  const run = async (action: (o: TimerOutput) => void) => {
    const handle = handleRef.current;
    if (!handle || !rtRef.current) return;
    try {
      action(handle.getOutput());
      await rtRef.current.flush();
      setOutput(handle.getOutput());
    } catch (e) {
      setError((e as Error).message);
    }
  };

  if (error) return <p style={{ color: '#b91c1c' }}>Error: {error}</p>;

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 560 }}>
      <p>
        A component running on <em>your</em> runtime (not React). React only displays its output.
      </p>
      <output style={{ fontFamily: 'monospace', fontSize: 16 }}>{output?.text ?? '…'}</output>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => run((o) => o.increment())}>
          +1
        </button>
        <button type="button" onClick={() => run((o) => o.incrementThrice())}>
          +3 in one tick (one render?)
        </button>
        <button type="button" onClick={() => run((o) => o.toggle())}>
          Start / stop interval
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              setOutput(handleRef.current?.rerender({ label: `Timer ${new Date().getSeconds()}s` }) ?? null);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          rerender with new props
        </button>
      </div>
      <h3>Runtime log (newest first)</h3>
      <ol style={{ fontFamily: 'monospace', fontSize: 13 }}>
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </div>
  );
}
