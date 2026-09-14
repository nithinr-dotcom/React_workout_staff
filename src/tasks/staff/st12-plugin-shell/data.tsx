import { useState } from 'react';
import type { LazyPluginEntry, Plugin, PluginStorage } from './types';

/* Sample plugins for the Playground. They only use the public PluginContext API. */

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function NotesPanel({ storage }: { storage: PluginStorage }) {
  const [text, setText] = useState(() => storage.get<string>('draft') ?? '');
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      Draft (persisted in namespaced storage)
      <textarea
        rows={4}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          storage.set('draft', e.target.value);
        }}
      />
    </label>
  );
}

export const notesPlugin: Plugin = {
  id: 'notes',
  version: '1.3.0',
  engines: '^1.0.0',
  activate(ctx) {
    ctx.contribute('sidebarPanels', { id: 'notes-panel', title: 'Notes', component: () => <NotesPanel storage={ctx.storage} /> });
    ctx.contribute('toolbar', {
      id: 'notes-save',
      label: 'Save note',
      onClick: () => ctx.events.emit('notes:saved', { at: new Date().toLocaleTimeString() }),
    });
    ctx.contribute('commands', { id: 'notes-clear', title: 'Clear draft', run: () => ctx.storage.remove('draft') });
  },
};

/** Lazily "downloaded" plugin that listens to other plugins over the event bus. */
export const activityEntry: LazyPluginEntry = {
  id: 'activity',
  async load() {
    await delay(800);
    const plugin: Plugin = {
      id: 'activity',
      version: '0.4.1',
      engines: '^1.2.0',
      activate(ctx) {
        const log: string[] = [];
        ctx.events.on('notes:saved', (payload) => {
          log.unshift(`Note saved at ${(payload as { at: string }).at}`);
        });
        const timer = setInterval(() => ctx.events.emit('activity:tick'), 5000);
        ctx.onDispose(() => clearInterval(timer));
        ctx.contribute('commands', {
          id: 'activity-dump',
          title: 'Show activity log',
          run: () => alert(log.length ? log.join('\n') : 'No activity yet'),
        });
      },
    };
    return { default: plugin };
  },
};

/** Built for an older host major version: must end up "incompatible". */
export const legacyPlugin: Plugin = {
  id: 'legacy-export',
  version: '3.0.0',
  engines: '^0.9.0',
  activate(ctx) {
    ctx.contribute('toolbar', { id: 'legacy', label: 'Export (legacy)', onClick: () => {} });
  },
};

function CrashyPanel(): never {
  throw new Error('Cannot read properties of undefined (reading "chart")');
}

/** Contributes a panel that crashes on render. The rest of the shell must survive. */
export const crashyPlugin: Plugin = {
  id: 'charts',
  version: '2.0.0',
  engines: '^1.1.0',
  activate(ctx) {
    ctx.contribute('sidebarPanels', { id: 'charts-panel', title: 'Charts', component: CrashyPanel });
  },
};

/** Throws during activation: must end up "failed" with its partial contribution rolled back. */
export const brokenActivatePlugin: Plugin = {
  id: 'broken-activate',
  version: '1.0.0',
  engines: '^1.0.0',
  activate(ctx) {
    ctx.contribute('toolbar', { id: 'half', label: 'Half-registered', onClick: () => {} });
    throw new Error('Missing config for broken-activate');
  },
};

export const SAMPLE_ENTRIES: (Plugin | LazyPluginEntry)[] = [notesPlugin, activityEntry, legacyPlugin, crashyPlugin, brokenActivatePlugin];
