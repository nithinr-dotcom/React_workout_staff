import { useState } from 'react';
import type { ToastModule, ToastType } from './types';

const SAMPLES: { type: ToastType; message: string }[] = [
  { type: 'success', message: 'Payment of ₹1,499 received.' },
  { type: 'info', message: 'A new version is available. Refresh to update.' },
  { type: 'warning', message: 'Your session expires in 2 minutes.' },
  { type: 'error', message: 'Could not save changes. Check your connection.' },
];

export default function Playground({ impl }: { impl: ToastModule }) {
  const { ToastProvider } = impl;
  const [maxVisible, setMaxVisible] = useState(3);
  return (
    <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
      <label>
        maxVisible{' '}
        <input type="number" min={1} max={6} value={maxVisible} onChange={(e) => setMaxVisible(Number(e.target.value) || 1)} />
      </label>
      <ToastProvider key={maxVisible} maxVisible={maxVisible} defaultDuration={4000}>
        <Controls useToast={impl.useToast} />
      </ToastProvider>
    </div>
  );
}

function Controls({ useToast }: { useToast: ToastModule['useToast'] }) {
  const toast = useToast();
  const [lastId, setLastId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => void) => {
    try {
      setError(null);
      fn();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {SAMPLES.map((s) => (
          <button key={s.type} type="button" onClick={() => run(() => setLastId(toast.show(s)))}>
            Show {s.type}
          </button>
        ))}
        <button type="button" onClick={() => run(() => setLastId(toast.show({ message: 'Sticky: stays until closed.', duration: 0 })))}>
          Show sticky
        </button>
        <button
          type="button"
          onClick={() =>
            run(() => {
              for (let i = 1; i <= 6; i++) toast.show({ message: `Burst toast ${i} of 6`, type: 'info' });
            })
          }
        >
          Burst ×6 (queue)
        </button>
        <button type="button" disabled={!lastId} onClick={() => lastId && run(() => toast.dismiss(lastId))}>
          dismiss(last id)
        </button>
      </div>
      <p style={{ color: '#667085', fontSize: 13 }}>Hover a toast to pause its timer.</p>
      {error && <p style={{ color: '#b91c1c' }}>Error: {error}</p>}
    </div>
  );
}
