import { useState, type ComponentType } from 'react';
import { SAMPLE_EMAILS } from './data';
import type { EmailClientProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<EmailClientProps> } }) {
  const EmailClient = impl.default;
  const [session, setSession] = useState(0);
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => setSession((s) => s + 1)}>
          Reset mailbox
        </button>
        <span style={{ color: '#667085', fontSize: 13 }}>
          Tab into the message list, then try <kbd>j</kbd>/<kbd>k</kbd>, <kbd>Enter</kbd>, <kbd>x</kbd>, <kbd>e</kbd> and{' '}
          <kbd>#</kbd>.
        </span>
      </div>
      <div style={{ height: 560 }}>
        <EmailClient key={session} initialEmails={SAMPLE_EMAILS} />
      </div>
    </div>
  );
}
