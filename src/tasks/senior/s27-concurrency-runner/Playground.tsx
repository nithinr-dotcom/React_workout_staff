import { useEffect, useMemo, useRef, useState } from 'react';
import type { ConcurrencyModule, Queue } from './types';

type JobState = 'waiting' | 'running' | 'done' | 'failed';
interface Job {
  id: number;
  duration: number;
  state: JobState;
}

const COLORS: Record<JobState, string> = {
  waiting: '#e2e8f0',
  running: '#fbbf24',
  done: '#34d399',
  failed: '#f87171',
};

export default function Playground({ impl }: { impl: ConcurrencyModule }) {
  const [concurrency, setConcurrency] = useState(3);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({ size: 0, pending: 0, isPaused: false });
  const [message, setMessage] = useState<string | null>(null);
  const nextId = useRef(1);

  const { queue, error } = useMemo((): { queue: Queue | null; error: string | null } => {
    try {
      return { queue: impl.createQueue({ concurrency }), error: null };
    } catch (e) {
      return { queue: null, error: (e as Error).message };
    }
  }, [impl, concurrency]);

  // Poll the queue's counters for display only. The queue itself must not poll.
  useEffect(() => {
    if (!queue) return;
    const id = setInterval(() => {
      try {
        setStats({ size: queue.size, pending: queue.pending, isPaused: queue.isPaused });
      } catch {
        /* stub getters may throw */
      }
    }, 100);
    return () => clearInterval(id);
  }, [queue]);

  const setJobState = (id: number, state: JobState) =>
    setJobs((js) => js.map((j) => (j.id === id ? { ...j, state } : j)));

  const addJobs = (count: number) => {
    if (!queue) return;
    for (let i = 0; i < count; i++) {
      const job: Job = { id: nextId.current++, duration: 400 + Math.round(Math.random() * 1600), state: 'waiting' };
      setJobs((js) => [...js, job]);
      try {
        queue
          .add(
            () =>
              new Promise<void>((resolve, reject) => {
                setJobState(job.id, 'running');
                setTimeout(() => (Math.random() < 0.15 ? reject(new Error('random failure')) : resolve()), job.duration);
              }),
          )
          .then(
            () => setJobState(job.id, 'done'),
            () => setJobState(job.id, 'failed'),
          );
      } catch (e) {
        setMessage((e as Error).message);
      }
    }
  };

  const guard = (fn: () => void) => () => {
    try {
      fn();
    } catch (e) {
      setMessage((e as Error).message);
    }
  };

  const runMap = async () => {
    setMessage('mapAsyncLimit running…');
    const started = performance.now();
    try {
      const results = await impl.mapAsyncLimit(
        Array.from({ length: 8 }, (_, i) => i),
        concurrency,
        (n) => new Promise<number>((r) => setTimeout(() => r(n * n), 300 + Math.random() * 500)),
      );
      setMessage(`mapAsyncLimit → [${results.join(', ')}] in ${Math.round(performance.now() - started)}ms`);
    } catch (e) {
      setMessage(`mapAsyncLimit rejected: ${(e as Error).message}`);
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 640 }}>
      <label>
        Concurrency: {concurrency}{' '}
        <input
          type="range"
          min={1}
          max={8}
          value={concurrency}
          onChange={(e) => {
            setConcurrency(Number(e.target.value));
            setJobs([]);
          }}
        />
        <small> (changing it creates a fresh queue)</small>
      </label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button onClick={() => addJobs(1)}>Add 1 job</button>
        <button onClick={() => addJobs(10)}>Add 10 jobs</button>
        <button onClick={guard(() => queue?.pause())}>pause()</button>
        <button onClick={guard(() => queue?.resume())}>resume()</button>
        <button
          onClick={guard(() => {
            setMessage('waiting for onIdle()…');
            queue?.onIdle().then(() => setMessage('onIdle() resolved'));
          })}
        >
          onIdle()
        </button>
        <button onClick={runMap}>Run mapAsyncLimit(8 items)</button>
      </div>
      {(error || message) && <p style={{ color: error ? '#b91c1c' : undefined }}>{error ?? message}</p>}
      <p>
        size (waiting): <strong>{stats.size}</strong> · pending (running): <strong>{stats.pending}</strong> · paused:{' '}
        <strong>{String(stats.isPaused)}</strong>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {jobs.map((j) => (
          <span
            key={j.id}
            title={`${j.duration}ms`}
            style={{ background: COLORS[j.state], borderRadius: 6, padding: '4px 8px', fontSize: 12 }}
          >
            #{j.id} {j.state}
          </span>
        ))}
      </div>
    </div>
  );
}
