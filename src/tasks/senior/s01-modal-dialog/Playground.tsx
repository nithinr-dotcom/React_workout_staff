import { useState, type ComponentType } from 'react';
import type { ModalProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<ModalProps> } }) {
  const Modal = impl.default;
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [strict, setStrict] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const add = (line: string) => setLog((l) => [line, ...l].slice(0, 8));

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
      <label>
        <input type="checkbox" checked={strict} onChange={(e) => setStrict(e.target.checked)} /> Disable backdrop click
        (closeOnBackdropClick=false)
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" onClick={() => setSettingsOpen(true)}>
          Open settings
        </button>
      </div>

      {/* Tall content so you can check the scroll lock. */}
      <div style={{ height: 1200, background: 'linear-gradient(#f9fafb, #e4e7ec)', padding: 12 }}>
        Scroll the page, then open the modal: the page behind should no longer scroll.
      </div>

      <Modal
        open={settingsOpen}
        title="Profile settings"
        closeOnBackdropClick={!strict}
        onClose={() => {
          add('settings: onClose');
          setSettingsOpen(false);
        }}
      >
        <form
          style={{ display: 'grid', gap: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            add('settings: saved');
            setSettingsOpen(false);
          }}
        >
          <label>
            Display name <input defaultValue="Priya" />
          </label>
          <label>
            Email <input type="email" defaultValue="priya@example.com" />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit">Save</button>
            <button type="button" onClick={() => setConfirmOpen(true)}>
              Delete account…
            </button>
          </div>
        </form>
      </Modal>

      {/* Follow-up 1: nested modal. */}
      <Modal
        open={confirmOpen}
        title="Delete account?"
        onClose={() => {
          add('confirm: onClose');
          setConfirmOpen(false);
        }}
      >
        <p>This cannot be undone.</p>
        <button type="button" onClick={() => setConfirmOpen(false)}>
          Cancel
        </button>
      </Modal>

      <ol style={{ fontFamily: 'monospace', fontSize: 13 }}>
        {log.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ol>
    </div>
  );
}
