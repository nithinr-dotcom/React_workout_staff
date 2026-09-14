import { useRef, useState } from 'react';
import type { RetryModule } from './types';

export default function Playground({ impl }: { impl: RetryModule }) {
  const [failuresBeforeSuccess, setFailures] = useState(2);
  const [retries, setRetries] = useState(3);
  const [baseDelay, setBaseDelay] = useState(300);
  const [factor, setFactor] = useState(2);
  const [maxDelay, setMaxDelay] = useState(2000);
  const [jitter, setJitter] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const startRef = useRef(0);

  const say = (line: string) => {
    const t = ((performance.now() - startRef.current) / 1000).toFixed(2);
    setLog((l) => [...l, `+${t}s  ${line}`].slice(-20));
  };

  const runRetry = () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    startRef.current = performance.now();
    setLog([]);
    setRunning(true);
    const flaky = (attempt: number) => {
      say(`attempt ${attempt} started`);
      return new Promise<string>((resolve, reject) =>
        setTimeout(() => (attempt > failuresBeforeSuccess ? resolve(`success on attempt ${attempt}`) : reject(new Error(`attempt ${attempt} failed`))), 150),
      ).then(
        (v) => {
          say(`attempt ${attempt} resolved`);
          return v;
        },
        (e: Error) => {
          say(e.message);
          throw e;
        },
      );
    };
    try {
      impl
        .retry(flaky, { retries, baseDelay, factor, maxDelay, jitter, signal: controller.signal })
        .then(
          (v) => say(`✓ retry resolved: ${v}`),
          (e: Error) => say(`✗ retry rejected: ${e.name}: ${e.message}`),
        )
        .finally(() => setRunning(false));
    } catch (e) {
      say(`⚠ ${(e as Error).message}`);
      setRunning(false);
    }
  };

  const runTimeout = (workMs: number) => {
    startRef.current = performance.now();
    setLog([]);
    try {
      const work = new Promise<string>((resolve) => setTimeout(() => resolve(`work finished in ${workMs}ms`), workMs));
      impl.withTimeout(work, 1000).then(
        (v) => say(`✓ ${v}`),
        (e: Error) => say(`✗ ${e.name}: ${e.message}`),
      );
      say(`withTimeout(work ${workMs}ms, 1000ms) started`);
    } catch (e) {
      say(`⚠ ${(e as Error).message}`);
    }
  };

  const numberInput = (label: string, value: number, set: (n: number) => void, step = 1) => (
    <label style={{ display: 'grid', gap: 2, fontSize: 13 }}>
      {label}
      <input type="number" value={value} step={step} onChange={(e) => set(Number(e.target.value))} style={{ width: 90 }} />
    </label>
  );

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 16, maxWidth: 680 }}>
      <section style={{ display: 'grid', gap: 8 }}>
        <h3>retry(flakyRequest)</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'end' }}>
          {numberInput('Fails before success', failuresBeforeSuccess, setFailures)}
          {numberInput('retries', retries, setRetries)}
          {numberInput('baseDelay (ms)', baseDelay, setBaseDelay, 50)}
          {numberInput('factor', factor, setFactor, 0.5)}
          {numberInput('maxDelay (ms)', maxDelay, setMaxDelay, 100)}
          <label style={{ fontSize: 13 }}>
            <input type="checkbox" checked={jitter} onChange={(e) => setJitter(e.target.checked)} /> jitter
          </label>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={runRetry}>
            Run retry
          </button>
          <button type="button" disabled={!running} onClick={() => controllerRef.current?.abort()}>
            Abort
          </button>
        </div>
      </section>
      <section style={{ display: 'grid', gap: 8 }}>
        <h3>withTimeout (1000ms)</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => runTimeout(400)}>
            Work takes 400ms
          </button>
          <button type="button" onClick={() => runTimeout(2500)}>
            Work takes 2500ms
          </button>
        </div>
      </section>
      <pre style={{ background: '#f2f4f7', padding: 12, minHeight: 120, fontSize: 13, margin: 0 }}>{log.join('\n') || 'Log output appears here.'}</pre>
    </div>
  );
}
