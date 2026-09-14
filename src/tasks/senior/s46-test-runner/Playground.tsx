import { useState } from 'react';
import type { RunReport, TestRunnerModule } from './types';

/** A tiny module under test. Toggle the bug to watch the report change. */
function makeCart(buggy: boolean) {
  const items: { name: string; price: number; qty: number }[] = [];
  return {
    items,
    add(name: string, price: number, qty = 1) {
      if (price < 0) throw new RangeError('price must be positive');
      items.push({ name, price, qty });
    },
    total() {
      return items.reduce((sum, i) => sum + i.price * (buggy ? 1 : i.qty), 0);
    },
    checkout(api: { charge(amount: number): Promise<string> }) {
      return api.charge(this.total());
    },
  };
}

const STATUS_COLOR = { passed: '#067647', failed: '#b42318', skipped: '#667085' } as const;

export default function Playground({ impl }: { impl: TestRunnerModule }) {
  const [buggy, setBuggy] = useState(false);
  const [slow, setSlow] = useState(false);
  const [report, setReport] = useState<RunReport | null>(null);
  const [hookLog, setHookLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const runSuite = async () => {
    setError(null);
    setReport(null);
    setRunning(true);
    const log: string[] = [];
    try {
      const { describe, it, beforeEach, afterEach, run } = impl.createTestRunner({ timeout: 300 });
      const { expect, spyOn } = impl;
      let cart = makeCart(buggy);

      beforeEach(() => {
        log.push('root beforeEach: new cart');
        cart = makeCart(buggy);
      });

      describe('cart', () => {
        it('starts empty', () => expect(cart.items).toEqual([]));

        it('adds items', () => {
          cart.add('pen', 2);
          expect(cart.items).toEqual([{ name: 'pen', price: 2, qty: 1 }]);
          expect(cart.items.map((i) => i.name)).toContain('pen');
        });

        it('rejects negative prices', () => {
          expect(() => cart.add('refund', -1)).toThrow(RangeError);
          expect(() => cart.add('ok', 1)).not.toThrow();
        });

        describe('totals', () => {
          beforeEach(() => {
            log.push('totals beforeEach: seed items');
            cart.add('book', 10, 2);
            cart.add('pen', 2, 3);
          });
          afterEach(() => {
            log.push('totals afterEach');
          });

          it('multiplies by quantity', () => expect(cart.total()).toBe(26));
        });

        describe('checkout', () => {
          it('charges the total through the API', async () => {
            const api = { charge: async (amount: number) => `charged ${amount}` };
            const spy = spyOn(api, 'charge').mockImplementation(async (amount: number) => {
              if (slow) await new Promise((r) => setTimeout(r, 1000));
              return `fake charge ${amount}`;
            });
            cart.add('mug', 8, 2);
            expect(await cart.checkout(api)).toBe('fake charge 16');
            expect(spy.calls).toEqual([[16]]);
            spy.restore();
          });
        });
      });

      setReport(await run());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setHookLog(log);
      setRunning(false);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 720 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <label>
          <input type="checkbox" checked={buggy} onChange={(e) => setBuggy(e.target.checked)} /> introduce a bug in total()
        </label>
        <label>
          <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} /> make checkout slower than the 300ms timeout
        </label>
        <button onClick={runSuite} disabled={running}>
          {running ? 'Running…' : 'run()'}
        </button>
      </div>
      {error && <p style={{ color: '#b91c1c', margin: 0 }}>Error: {error}</p>}
      {report && (
        <section>
          <p style={{ margin: '0 0 8px' }}>
            <strong>{report.passed}</strong> passed · <strong>{report.failed}</strong> failed
            {report.skipped !== undefined && (
              <>
                {' '}
                · <strong>{report.skipped}</strong> skipped
              </>
            )}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
            {report.results.map((r) => (
              <li key={r.name} style={{ fontFamily: 'monospace', fontSize: 13 }}>
                <span style={{ color: STATUS_COLOR[r.status] }}>{r.status.toUpperCase()}</span> {r.name}
                {r.error !== undefined && <div style={{ color: '#b42318', paddingLeft: 16 }}>{r.error instanceof Error ? r.error.message : String(r.error)}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}
      {hookLog.length > 0 && (
        <details>
          <summary>Hook log</summary>
          <pre style={{ background: '#f2f4f7', padding: 12, fontSize: 13, margin: 0 }}>{hookLog.join('\n')}</pre>
        </details>
      )}
    </div>
  );
}
