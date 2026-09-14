import { useState, type ComponentType } from 'react';
import type { FormWizardProps, WizardData } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<FormWizardProps> } }) {
  const FormWizard = impl.default;
  const [submitted, setSubmitted] = useState<WizardData | null>(null);
  const [run, setRun] = useState(0);

  const onSubmit = async (data: WizardData) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setSubmitted(data);
  };

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
      <FormWizard key={run} onSubmit={onSubmit} />
      <button
        type="button"
        onClick={() => {
          setSubmitted(null);
          setRun((r) => r + 1);
        }}
      >
        Reset playground
      </button>
      {submitted && (
        <pre style={{ fontSize: 13, background: '#f2f4f7', padding: 12 }}>
          onSubmit received: {JSON.stringify({ ...submitted, password: '•'.repeat(submitted.password.length) }, null, 2)}
        </pre>
      )}
    </div>
  );
}
