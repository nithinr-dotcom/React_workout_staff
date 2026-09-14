import { useState } from 'react';
import type { MyPromiseConstructor, PromisePolyfillModule } from './types';

type Log = (line: string) => void;

interface Scenario {
  name: string;
  run: (P: MyPromiseConstructor, log: Log) => void;
}

const describeValue = (v: unknown) => (v instanceof Error ? `${v.name}("${v.message}")` : JSON.stringify(v));

const SCENARIOS: Scenario[] = [
  {
    name: 'Ordering: sync vs microtask vs timeout',
    run: (P, log) => {
      setTimeout(() => log('timeout 0'), 0);
      new P<string>((resolve) => {
        log('executor');
        resolve('a');
      }).then((v) => log(`then ${v}`));
      queueMicrotask(() => log('queueMicrotask'));
      log('sync end');
    },
  },
  {
    name: 'Chaining with a thrown error',
    run: (P, log) => {
      P.resolve(1)
        .then((n) => {
          log(`got ${n}, returning ${n + 1}`);
          return n + 1;
        })
        .then((n) => {
          log(`got ${n}, throwing`);
          throw new Error('boom');
        })
        .then(() => log('SHOULD NOT RUN'))
        .catch((e) => {
          log(`caught ${describeValue(e)}`);
          return 'recovered';
        })
        .finally(() => log('finally'))
        .then((v) => log(`final value ${describeValue(v)}`));
    },
  },
  {
    name: 'Adopting a slow thenable',
    run: (P, log) => {
      const thenable = {
        then(onFulfilled: (v: string) => void) {
          log('thenable.then called');
          setTimeout(() => onFulfilled('from thenable'), 300);
        },
      } as unknown as PromiseLike<string>;
      P.resolve(0)
        .then(() => thenable)
        .then((v) => log(`adopted ${describeValue(v)}`));
    },
  },
  {
    name: 'Self-resolution',
    run: (P, log) => {
      const self: PromiseLike<unknown> = P.resolve(1).then(() => self);
      self.then(
        () => log('SHOULD NOT FULFIL'),
        (e) => log(`rejected with ${describeValue(e)}`),
      );
    },
  },
  {
    name: 'finally overriding the outcome',
    run: (P, log) => {
      P.resolve('original')
        .finally(() => {
          throw new Error('finally failed');
        })
        .then(
          (v) => log(`fulfilled ${describeValue(v)}`),
          (e) => log(`rejected ${describeValue(e)}`),
        );
    },
  },
];

function runScenario(P: MyPromiseConstructor, scenario: Scenario): Promise<string[]> {
  const lines: string[] = [];
  const log: Log = (line) => lines.push(line);
  try {
    scenario.run(P, log);
  } catch (e) {
    log(`threw synchronously: ${describeValue(e)}`);
  }
  return new Promise((resolve) => setTimeout(() => resolve(lines), 500));
}

export default function Playground({ impl }: { impl: PromisePolyfillModule }) {
  const [result, setResult] = useState<{ name: string; mine: string[]; native: string[] } | null>(null);
  const [running, setRunning] = useState(false);

  const run = async (scenario: Scenario) => {
    setRunning(true);
    const mine = await runScenario(impl.MyPromise, scenario);
    const native = await runScenario(Promise as unknown as MyPromiseConstructor, scenario);
    setResult({ name: scenario.name, mine, native });
    setRunning(false);
  };

  const column = (title: string, lines: string[]) => (
    <div>
      <h4 style={{ margin: '0 0 4px' }}>{title}</h4>
      <ol style={{ fontFamily: 'monospace', fontSize: 13, margin: 0 }}>
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </div>
  );

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 16, maxWidth: 720 }}>
      <p style={{ margin: 0 }}>
        Each scenario runs against your <code>MyPromise</code> and then against native <code>Promise</code>. The logs
        should match (tick-level differences for thenable adoption are allowed).
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SCENARIOS.map((s) => (
          <button key={s.name} type="button" disabled={running} onClick={() => run(s)}>
            {s.name}
          </button>
        ))}
      </div>
      {result && (
        <section>
          <h3 style={{ margin: '0 0 8px' }}>{result.name}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            {column('MyPromise', result.mine)}
            {column('native Promise', result.native)}
          </div>
        </section>
      )}
    </div>
  );
}
