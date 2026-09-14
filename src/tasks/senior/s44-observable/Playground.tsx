import { useEffect, useMemo, useRef, useState } from 'react';
import type { ISubject, ObservableModule, Subscription } from './types';

const box = { border: '1px solid #d0d5dd', borderRadius: 8, padding: 12, display: 'grid', gap: 8 } as const;

export default function Playground({ impl }: { impl: ObservableModule }) {
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const say = (line: string) => setLog((l) => [line, ...l].slice(0, 30));
  const attempt = (fn: () => void) => {
    try {
      setError(null);
      fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // interval → filter → map
  const intervalSub = useRef<Subscription | null>(null);
  const [intervalOn, setIntervalOn] = useState(false);
  const toggleInterval = () =>
    attempt(() => {
      if (intervalSub.current) {
        intervalSub.current.unsubscribe();
        intervalSub.current = null;
        setIntervalOn(false);
        say('interval: unsubscribed');
        return;
      }
      intervalSub.current = impl.Observable.interval(500)
        .pipe(
          impl.filter((n: number) => n % 2 === 0),
          impl.map((n: number, i: number) => `even #${i}: ${n}`),
        )
        .subscribe({ next: (v: string) => say(`interval: ${v}`), complete: () => say('interval: complete') });
      setIntervalOn(true);
    });

  // fromEvent on a real button
  const clickTarget = useRef<HTMLButtonElement>(null);
  const clickSub = useRef<Subscription | null>(null);
  const [listening, setListening] = useState(false);
  const toggleClicks = () =>
    attempt(() => {
      if (clickSub.current) {
        clickSub.current.unsubscribe();
        clickSub.current = null;
        setListening(false);
        return;
      }
      if (!clickTarget.current) return;
      clickSub.current = impl.Observable.fromEvent<MouseEvent>(clickTarget.current, 'click')
        .pipe(impl.map((e: MouseEvent, i: number) => `click #${i + 1} at (${e.clientX}, ${e.clientY})`))
        .subscribe((v: string) => say(`fromEvent: ${v}`));
      setListening(true);
    });

  // Subject with two subscribers
  const subject = useMemo<ISubject<string> | null>(() => {
    try {
      return new impl.Subject<string>();
    } catch {
      return null;
    }
  }, [impl]);
  const subjectSubs = useRef<Record<'A' | 'B', Subscription | null>>({ A: null, B: null });
  const [subscribed, setSubscribed] = useState({ A: false, B: false });
  const [message, setMessage] = useState('hello');
  const toggleSubscriber = (name: 'A' | 'B') =>
    attempt(() => {
      if (!subject) return;
      const current = subjectSubs.current[name];
      if (current) {
        current.unsubscribe();
        subjectSubs.current[name] = null;
      } else {
        subjectSubs.current[name] = subject.subscribe({
          next: (v: string) => say(`subject → ${name}: ${v}`),
          complete: () => say(`subject → ${name}: complete`),
        });
      }
      setSubscribed((s) => ({ ...s, [name]: !current }));
    });

  // from(promise)
  const fromPromise = () =>
    attempt(() => {
      say('from(promise): subscribed, resolving in 1s');
      impl.Observable.from(new Promise<string>((resolve) => setTimeout(() => resolve('user loaded'), 1000))).subscribe({
        next: (v: string) => say(`from(promise): ${v}`),
        complete: () => say('from(promise): complete'),
      });
    });

  useEffect(() => {
    const subs = subjectSubs.current;
    return () => {
      intervalSub.current?.unsubscribe();
      clickSub.current?.unsubscribe();
      subs.A?.unsubscribe();
      subs.B?.unsubscribe();
    };
  }, [impl]);

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 720 }}>
      <section style={box}>
        <strong>interval(500).pipe(filter(even), map(label))</strong>
        <div>
          <button onClick={toggleInterval}>{intervalOn ? 'Unsubscribe' : 'Subscribe'}</button>
        </div>
      </section>
      <section style={box}>
        <strong>fromEvent(button, &apos;click&apos;)</strong>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={toggleClicks}>{listening ? 'Stop listening' : 'Start listening'}</button>
          <button ref={clickTarget}>Click me</button>
        </div>
      </section>
      <section style={box}>
        <strong>Subject: multicast</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => toggleSubscriber('A')}>{subscribed.A ? 'Unsubscribe A' : 'Subscribe A'}</button>
          <button onClick={() => toggleSubscriber('B')}>{subscribed.B ? 'Unsubscribe B' : 'Subscribe B'}</button>
          <label>
            Message <input value={message} onChange={(e) => setMessage(e.target.value)} />
          </label>
          <button onClick={() => attempt(() => subject?.next(message))}>next()</button>
          <button onClick={() => attempt(() => subject?.complete())}>complete()</button>
        </div>
      </section>
      <section style={box}>
        <strong>Observable.from(promise)</strong>
        <div>
          <button onClick={fromPromise}>Subscribe</button>
        </div>
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
