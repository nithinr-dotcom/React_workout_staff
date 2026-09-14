import { useMemo, useRef, useState } from 'react';
import type { EventEmitterModule, IEventEmitter } from './types';

const EVENTS = ['message', 'typing', 'close'];

interface Subscription {
  id: number;
  event: string;
  once: boolean;
  unsubscribe: () => void;
}

export default function Playground({ impl }: { impl: EventEmitterModule }) {
  const emitter = useMemo<IEventEmitter>(() => new impl.EventEmitter(), [impl]);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [event, setEvent] = useState(EVENTS[0]);
  const [payload, setPayload] = useState('hello');
  const [error, setError] = useState<string | null>(null);
  const nextId = useRef(1);

  const write = (line: string) => setLog((l) => [line, ...l].slice(0, 20));

  const attempt = (fn: () => void) => {
    try {
      setError(null);
      fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const subscribe = (once: boolean) =>
    attempt(() => {
      const id = nextId.current++;
      const listener = (...args: unknown[]) => {
        write(`listener #${id}${once ? ' (once)' : ''} on "${event}" got ${JSON.stringify(args)}`);
        if (once) setSubs((s) => s.filter((x) => x.id !== id));
      };
      const unsubscribe = once ? emitter.once(event, listener) : emitter.on(event, listener);
      setSubs((s) => [...s, { id, event, once, unsubscribe }]);
    });

  const emit = () =>
    attempt(() => {
      const had = emitter.emit(event, payload);
      write(`emit("${event}", "${payload}") → ${had}`);
    });

  const waitFor = () =>
    attempt(() => {
      write(`waitFor("${event}") pending…`);
      emitter.waitFor(event).then(
        (args) => write(`waitFor("${event}") resolved with ${JSON.stringify(args)}`),
        (e: Error) => setError(e.message),
      );
    });

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 640 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
        <label>
          Event{' '}
          <select value={event} onChange={(e) => setEvent(e.target.value)}>
            {EVENTS.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <label>
          Payload <input value={payload} onChange={(e) => setPayload(e.target.value)} />
        </label>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => subscribe(false)}>on()</button>
        <button onClick={() => subscribe(true)}>once()</button>
        <button onClick={emit}>emit()</button>
        <button onClick={waitFor}>waitFor()</button>
        <button
          onClick={() =>
            attempt(() => {
              emitter.removeAllListeners();
              setSubs([]);
              write('removeAllListeners()');
            })
          }
        >
          removeAllListeners()
        </button>
      </div>
      {error && <p style={{ color: '#b91c1c' }}>Error: {error}</p>}
      <section>
        <h4 style={{ margin: '4px 0' }}>Subscriptions</h4>
        {subs.length === 0 && <p style={{ color: '#667085' }}>None yet.</p>}
        <ul style={{ paddingLeft: 18 }}>
          {subs.map((s) => (
            <li key={s.id}>
              #{s.id} on &quot;{s.event}&quot; {s.once && '(once)'}{' '}
              <button
                onClick={() =>
                  attempt(() => {
                    s.unsubscribe();
                    setSubs((all) => all.filter((x) => x.id !== s.id));
                  })
                }
              >
                unsubscribe
              </button>
            </li>
          ))}
        </ul>
        <p>
          listenerCount(&quot;{event}&quot;):{' '}
          <strong>
            {(() => {
              try {
                return emitter.listenerCount(event);
              } catch {
                return '—';
              }
            })()}
          </strong>
        </p>
      </section>
      <ol style={{ fontFamily: 'monospace', fontSize: 13 }}>
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
    </div>
  );
}
