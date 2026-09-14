import { useState, type ComponentType } from 'react';
import type { SignupFormProps, SignupValues } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<SignupFormProps> } }) {
  const SignupForm = impl.default;
  const [log, setLog] = useState<string[]>([]);
  const [key, setKey] = useState(0);

  const fakeSignup = (values: SignupValues) =>
    new Promise<void>((resolve, reject) => {
      setLog((l) => [`onSubmit(${JSON.stringify({ ...values, password: '•••', confirmPassword: '•••' })})`, ...l].slice(0, 6));
      setTimeout(() => {
        if (values.email.toLowerCase() === 'taken@example.com') reject(new Error('That email is already registered.'));
        else resolve();
      }, 1200);
    });

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 480 }}>
      <p style={{ margin: 0, color: '#667085' }}>
        Tip: use <code>taken@example.com</code> to see the server error state.
      </p>
      <SignupForm key={key} onSubmit={fakeSignup} />
      <button type="button" onClick={() => setKey((k) => k + 1)}>
        Remount form
      </button>
      <ol style={{ fontFamily: 'monospace', fontSize: 12 }}>
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </div>
  );
}
