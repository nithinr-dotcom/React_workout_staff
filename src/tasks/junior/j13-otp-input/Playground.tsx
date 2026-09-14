import { useState, type ComponentType } from 'react';
import type { OtpInputProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<OtpInputProps> } }) {
  const OtpInput = impl.default;
  const [completed, setCompleted] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [resetKey, setResetKey] = useState(0);

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
      <section>
        <h3>6 digits (default)</h3>
        <p style={{ color: '#667085' }}>Try pasting: 12-34 56</p>
        <OtpInput
          key={resetKey}
          onChange={(d) => setCurrent(d.map((x) => x || '_').join(' '))}
          onComplete={(code) => setCompleted((c) => [code, ...c].slice(0, 5))}
        />
        <p>
          Current: <code>{current || '(empty)'}</code>{' '}
          <button type="button" onClick={() => setResetKey((k) => k + 1)}>
            Reset
          </button>
        </p>
        <p>onComplete calls:</p>
        <ol>
          {completed.map((code, i) => (
            <li key={i}>
              <code>{code}</code>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h3>length=4</h3>
        <OtpInput length={4} />
      </section>
      <section>
        <h3>disabled</h3>
        <OtpInput length={4} disabled />
      </section>
    </div>
  );
}
