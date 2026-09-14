import { useEffect, useState, type ComponentType } from 'react';
import type { ProgressBarProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<ProgressBarProps> } }) {
  const ProgressBar = impl.default;
  const [value, setValue] = useState(42);
  const [uploading, setUploading] = useState(false);
  const [upload, setUpload] = useState(0);

  useEffect(() => {
    if (!uploading) return;
    const id = setInterval(() => {
      setUpload((u) => {
        const next = u + Math.random() * 12;
        if (next >= 100) {
          setUploading(false);
          return 100;
        }
        return next;
      });
    }, 300);
    return () => clearInterval(id);
  }, [uploading]);

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
      <section>
        <h3>Controlled by a slider (−20 to 120 to test clamping)</h3>
        <input
          type="range"
          aria-label="Value"
          min={-20}
          max={120}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
        />{' '}
        <code>value={value}</code>
        <ProgressBar value={value} label="Profile completion" />
      </section>
      <section>
        <h3>Simulated upload</h3>
        <button
          type="button"
          onClick={() => {
            setUpload(0);
            setUploading(true);
          }}
        >
          Start upload
        </button>
        <ProgressBar value={upload} label="Uploading report.pdf" />
      </section>
      <section>
        <h3>showValue=false and NaN</h3>
        <ProgressBar value={Number.NaN} label="Broken input" showValue={false} />
      </section>
      <section>
        <h3>Indeterminate (follow-up 1)</h3>
        <ProgressBar value={0} label="Connecting…" indeterminate />
      </section>
    </div>
  );
}
