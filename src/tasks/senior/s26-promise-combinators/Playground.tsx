import { useRef, useState } from 'react';
import type { PromiseCombinatorsModule } from './types';

interface TaskConfig {
  id: number;
  delay: number;
  fails: boolean;
}

type CombinatorName = 'promiseAll' | 'promiseAllSettled' | 'promiseAny' | 'promiseRace';
const COMBINATORS: CombinatorName[] = ['promiseAll', 'promiseAllSettled', 'promiseAny', 'promiseRace'];

const INITIAL: TaskConfig[] = [
  { id: 1, delay: 800, fails: false },
  { id: 2, delay: 300, fails: true },
  { id: 3, delay: 1200, fails: false },
];

function describe(value: unknown): string {
  if (value instanceof AggregateError) return `AggregateError(${JSON.stringify(value.errors.map(describe))})`;
  if (value instanceof Error) return `Error("${value.message}")`;
  return JSON.stringify(value);
}

export default function Playground({ impl }: { impl: PromiseCombinatorsModule }) {
  const [tasks, setTasks] = useState<TaskConfig[]>(INITIAL);
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const startedAt = useRef(0);
  const nextId = useRef(INITIAL.length + 1);

  const stamp = (line: string) => {
    const ms = Math.round(performance.now() - startedAt.current);
    setLog((l) => [...l, `+${String(ms).padStart(5)}ms  ${line}`]);
  };

  const run = async (name: CombinatorName) => {
    setLog([]);
    setRunning(true);
    startedAt.current = performance.now();
    const inputs = tasks.map(
      (t) =>
        new Promise<string>((resolve, reject) => {
          setTimeout(() => {
            if (t.fails) {
              stamp(`task ${t.id} rejected`);
              reject(new Error(`task ${t.id} failed`));
            } else {
              stamp(`task ${t.id} fulfilled`);
              resolve(`task ${t.id}`);
            }
          }, t.delay);
        }),
    );
    // Keep the demo quiet about rejections the combinator chose to ignore.
    inputs.forEach((p) => p.catch(() => {}));
    try {
      const combinator = impl[name] as (values: Iterable<Promise<string>>) => Promise<unknown>;
      const result = await combinator(inputs);
      stamp(`${name} FULFILLED → ${describe(result)}`);
    } catch (e) {
      stamp(`${name} REJECTED → ${describe(e)}`);
    } finally {
      setRunning(false);
    }
  };

  const update = (id: number, patch: Partial<TaskConfig>) =>
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 16, maxWidth: 640 }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left' }}>Task</th>
            <th style={{ textAlign: 'left' }}>Delay (ms)</th>
            <th style={{ textAlign: 'left' }}>Rejects?</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id}>
              <td>task {t.id}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={t.delay}
                  aria-label={`Delay for task ${t.id}`}
                  onChange={(e) => update(t.id, { delay: Number(e.target.value) })}
                  style={{ width: 90 }}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={t.fails}
                  aria-label={`Task ${t.id} rejects`}
                  onChange={(e) => update(t.id, { fails: e.target.checked })}
                />
              </td>
              <td>
                <button onClick={() => setTasks((ts) => ts.filter((x) => x.id !== t.id))}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <button onClick={() => setTasks((ts) => [...ts, { id: nextId.current++, delay: 500, fails: false }])}>
          Add task
        </button>{' '}
        <small>Try removing every task to see the empty-input semantics.</small>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {COMBINATORS.map((name) => (
          <button key={name} disabled={running} onClick={() => run(name)}>
            {name}()
          </button>
        ))}
      </div>
      {running && tasks.length === 0 && <p>An empty race never settles. That is the spec. Reload to reset.</p>}
      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, minHeight: 120 }}>
        {log.length ? log.join('\n') : 'Pick a combinator to run the tasks above.'}
      </pre>
    </div>
  );
}
