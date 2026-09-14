import { useEffect, useRef, useState } from 'react';
import { setNotes, useTaskProgress } from '../../lib/progressStore';
import { Markdown } from './Markdown';
import s from '../shell.module.css';

const TEMPLATE = `## Clarifying questions I asked
-

## Approach / component tree
-

## What I got stuck on
-

## Learned from the reference
-
`;

export function NotesEditor({ taskId }: { taskId: string }) {
  const { notes } = useTaskProgress(taskId);
  const [draft, setDraft] = useState(notes);
  const [preview, setPreview] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Re-sync the draft when switching tasks.
  const [syncedTask, setSyncedTask] = useState(taskId);
  if (syncedTask !== taskId) {
    setSyncedTask(taskId);
    setDraft(notes);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (value: string) => {
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotes(taskId, value), 400);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className={`${s.btn} ${s.btnSmall}`} onClick={() => setPreview((p) => !p)}>
          {preview ? 'Edit' : 'Preview'}
        </button>
        {!draft && (
          <button className={`${s.btn} ${s.btnSmall}`} onClick={() => change(TEMPLATE)}>
            Insert template
          </button>
        )}
        <span className={s.muted} style={{ fontSize: 12, alignSelf: 'center' }}>
          Saved in this browser. Export from the dashboard.
        </span>
      </div>
      {preview ? (
        <Markdown>{draft || '_No notes yet._'}</Markdown>
      ) : (
        <textarea
          className={s.notes}
          value={draft}
          onChange={(e) => change(e.target.value)}
          onBlur={() => setNotes(taskId, draft)}
          placeholder="Clarifying questions, approach, mistakes, things to remember… (Markdown)"
          aria-label="Notes"
        />
      )}
    </div>
  );
}
