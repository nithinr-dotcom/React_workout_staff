import { useState } from 'react';
import type { ProduceModule } from './types';

interface Todo {
  id: number;
  title: string;
  done: boolean;
}
interface AppState {
  todos: Todo[];
  filter: 'all' | 'open';
  user: { name: string; prefs: { theme: string } };
}

const INITIAL: AppState = {
  todos: [
    { id: 1, title: 'Read the README', done: true },
    { id: 2, title: 'Write produce()', done: false },
    { id: 3, title: 'Explain structural sharing', done: false },
  ],
  filter: 'all',
  user: { name: 'Sam', prefs: { theme: 'light' } },
};

type Action = { label: string; recipe: (draft: AppState) => AppState | void };

const ACTIONS: Action[] = [
  { label: 'Toggle todo #2', recipe: (d) => void (d.todos[1].done = !d.todos[1].done) },
  { label: 'Add todo', recipe: (d) => void d.todos.push({ id: Date.now(), title: 'New todo', done: false }) },
  { label: 'Remove done todos', recipe: (d) => void (d.todos = d.todos.filter((t) => !t.done)) },
  { label: 'Toggle theme', recipe: (d) => void (d.user.prefs.theme = d.user.prefs.theme === 'light' ? 'dark' : 'light') },
  { label: 'No-op (read only)', recipe: (d) => void d.todos.map((t) => t.title) },
  { label: 'Return replacement', recipe: () => INITIAL },
];

function sharing(prev: AppState, next: AppState) {
  const rows: [string, unknown, unknown][] = [
    ['state', prev, next],
    ['state.todos', prev.todos, next.todos],
    ...prev.todos.map((t, i): [string, unknown, unknown] => [`state.todos[${i}] (id ${t.id})`, t, next.todos?.find((n) => n.id === t.id)]),
    ['state.user', prev.user, next.user],
    ['state.user.prefs', prev.user.prefs, next.user?.prefs],
  ];
  return rows.map(([path, a, b]) => ({ path, verdict: b === undefined ? 'removed' : a === b ? 'shared (===)' : 'new copy' }));
}

export default function Playground({ impl }: { impl: ProduceModule }) {
  const [state, setState] = useState<AppState>(INITIAL);
  const [report, setReport] = useState<{ label: string; rows: { path: string; verdict: string }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (action: Action) => {
    try {
      const next = impl.produce(state, action.recipe);
      setReport({ label: action.label, rows: sharing(state, next) });
      setState(next);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 720 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ACTIONS.map((a) => (
          <button key={a.label} type="button" onClick={() => run(a)}>
            {a.label}
          </button>
        ))}
        <button type="button" onClick={() => setState(INITIAL)}>
          Reset
        </button>
      </div>
      {error && <p style={{ color: '#b91c1c', margin: 0 }}>Error: {error}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <pre style={{ margin: 0, fontSize: 12, background: '#f9fafb', padding: 8 }}>{JSON.stringify(state, null, 2)}</pre>
        {report && (
          <div>
            <strong>{report.label}</strong>
            <table style={{ fontSize: 13, borderCollapse: 'collapse' }}>
              <tbody>
                {report.rows.map((r) => (
                  <tr key={r.path}>
                    <td style={{ fontFamily: 'monospace', paddingRight: 12 }}>{r.path}</td>
                    <td style={{ color: r.verdict.startsWith('shared') ? '#15803d' : '#b45309' }}>{r.verdict}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
