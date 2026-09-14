import { useRef, useState } from 'react';
import type { AsyncFlowModule, AsyncFunc } from './types';

const box = { border: '1px solid #d0d5dd', borderRadius: 8, padding: 12, display: 'grid', gap: 8 } as const;

export default function Playground({ impl }: { impl: AsyncFlowModule }) {
  const [log, setLog] = useState<string[]>([]);
  const [failStep, setFailStep] = useState(false);
  const startedAt = useRef(0);

  const say = (line: string) => {
    const t = ((performance.now() - startedAt.current) / 1000).toFixed(2);
    setLog((l) => [...l, `+${t}s  ${line}`].slice(-40));
  };
  const begin = (title: string) => {
    startedAt.current = performance.now();
    setLog([]);
    say(title);
  };
  const attempt = (fn: () => void) => {
    try {
      fn();
    } catch (e) {
      say(`⚠ ${(e as Error).message}`);
    }
  };

  const step = (label: string, ms: number, map: (input: any) => any, fail = false): AsyncFunc => {
    return (callback, input) => {
      say(`${label} started with ${JSON.stringify(input)}`);
      setTimeout(() => {
        if (fail) {
          say(`${label} failed`);
          callback(new Error(`${label} failed`));
        } else {
          const out = map(input);
          say(`${label} finished → ${JSON.stringify(out)}`);
          callback(undefined, out);
        }
      }, ms);
    };
  };
  const steps = () => [
    step('double (600ms)', 600, (n: number) => n * 2),
    step('add 1 (300ms)', 300, (n: number) => n + 1, failStep),
    step('square (900ms)', 900, (n: number) => n * n),
  ];
  const finish = (name: string) => (error: unknown, data?: unknown) =>
    say(error ? `${name} final callback: error "${(error as Error).message}"` : `${name} final callback: ${JSON.stringify(data)}`);

  const runHelper = (name: 'sequence' | 'parallel' | 'race') => {
    begin(name);
    attempt(() => impl[name](steps())(finish(name), 3));
  };

  const factory = (label: string, ms: number) => () =>
    new Promise<string>((resolve) => {
      say(`${label} started`);
      setTimeout(() => {
        say(`${label} done`);
        resolve(label);
      }, ms);
    });

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 720 }}>
      <section style={box}>
        <strong>Callback helpers with input 3</strong>
        <label>
          <input type="checkbox" checked={failStep} onChange={(e) => setFailStep(e.target.checked)} /> make “add 1” fail
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => runHelper('sequence')}>sequence</button>
          <button onClick={() => runHelper('parallel')}>parallel</button>
          <button onClick={() => runHelper('race')}>race</button>
        </div>
      </section>
      <section style={box}>
        <strong>runInSequence([800ms, 200ms, 500ms])</strong>
        <div>
          <button
            onClick={() => {
              begin('runInSequence');
              attempt(() => {
                impl.runInSequence([factory('A', 800), factory('B', 200), factory('C', 500)]).then(
                  (results) => say(`resolved ${JSON.stringify(results)}`),
                  (e: Error) => say(`rejected: ${e.message}`),
                );
              });
            }}
          >
            Run
          </button>
        </div>
      </section>
      <section style={box}>
        <strong>compose: logger → auth → handler</strong>
        <div>
          <button
            onClick={() => {
              begin('compose');
              attempt(() => {
                const ctx = { user: null as string | null, body: '' };
                impl
                  .compose<typeof ctx>([
                    async (c, next) => {
                      const t = performance.now();
                      say('logger: before');
                      await next();
                      say(`logger: after (${Math.round(performance.now() - t)}ms), body = "${c.body}"`);
                    },
                    async (c, next) => {
                      say('auth: checking token…');
                      await new Promise((r) => setTimeout(r, 400));
                      c.user = 'ada';
                      await next();
                      say('auth: after');
                    },
                    (c) => {
                      say('handler');
                      c.body = `hello ${c.user}`;
                    },
                  ])(ctx)
                  .then(
                    () => say('pipeline resolved'),
                    (e: Error) => say(`pipeline rejected: ${e.message}`),
                  );
              });
            }}
          >
            Run pipeline
          </button>
        </div>
      </section>
      <pre style={{ background: '#f2f4f7', padding: 12, minHeight: 160, fontSize: 13, margin: 0 }}>{log.join('\n') || 'Log output appears here.'}</pre>
    </div>
  );
}
