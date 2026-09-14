import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { getTask } from '../lib/taskRegistry';
import { splitReadme } from '../lib/readme';
import { startTimer, useTaskProgress } from '../lib/progressStore';
import { LEVEL_LABEL } from '../lib/types';
import { Markdown } from './components/Markdown';
import { Timer } from './components/Timer';
import { StatusControls } from './components/StatusControls';
import { PreviewPane } from './components/PreviewPane';
import { FollowUps } from './components/FollowUps';
import { NotesEditor } from './components/NotesEditor';
import { AsyncCode } from './components/AsyncCode';
import s from './shell.module.css';

type Tab = 'requirements' | 'followups' | 'tests' | 'notes' | 'design' | 'reference' | 'history';
type Layout = 'split' | 'left' | 'right';

export function TaskPage() {
  const { taskId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const entry = getTask(taskId);
  const progress = useTaskProgress(taskId);
  const mock = params.get('mock') === '1';
  const tab = (params.get('tab') as Tab | null) ?? 'requirements';
  const [layout, setLayout] = useState<Layout>('split');

  const { body, followUps } = useMemo(() => splitReadme(entry?.readme ?? ''), [entry]);

  // Mock interview mode starts the clock as soon as the task opens.
  useEffect(() => {
    if (mock && entry) startTimer(entry.meta.id);
  }, [mock, entry]);

  if (!entry) {
    return (
      <div className={s.page}>
        <p>
          Task <code>{taskId}</code> not found. <Link to="/">Back to dashboard</Link>
        </p>
      </div>
    );
  }

  const { meta } = entry;
  const setTab = (t: Tab) =>
    setParams(
      (p) => {
        p.set('tab', t);
        return p;
      },
      { replace: true },
    );

  const tabs: { id: Tab; label: string; hidden?: boolean }[] = [
    { id: 'requirements', label: 'Requirements' },
    { id: 'followups', label: `Follow-ups (${Math.min(progress.followUpsUnlocked, followUps.length)}/${followUps.length})` },
    { id: 'tests', label: 'Tests' },
    { id: 'notes', label: progress.notes ? 'Notes •' : 'Notes' },
    { id: 'design', label: 'Design doc', hidden: !entry.design },
    { id: 'reference', label: 'Reference code', hidden: !progress.revealedEver },
    { id: 'history', label: `History (${progress.attempts.length})` },
  ];

  const testCommand = `npm test -- ${meta.id}`;

  return (
    <div className={s.taskPage}>
      <header className={s.taskHeader}>
        <div className={s.taskHeading}>
          <span className={`${s.badge} ${s[meta.level]}`}>{LEVEL_LABEL[meta.level]}</span>
          <span className={s.code}>{meta.code}</span>
          <h1>
            {meta.title} {meta.star && <span className={s.star}>★</span>}
          </h1>
          {mock && <span className={s.badge}>Mock</span>}
        </div>
        <div className={s.controls}>
          <Timer taskId={meta.id} minutes={meta.minutes} />
          <StatusControls taskId={meta.id} />
          <div className={s.segmented} aria-label="Layout">
            {(
              [
                ['left', '▤', 'Requirements only'],
                ['split', '◫', 'Split'],
                ['right', '▣', 'Preview only'],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                className={`${s.segment} ${layout === id ? s.segmentActive : ''}`}
                onClick={() => setLayout(id)}
                title={label}
                aria-label={label}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className={`${s.split} ${layout === 'left' ? s.splitLeft : layout === 'right' ? s.splitRight : ''}`}>
        <section className={s.pane} aria-label="Task details">
          <div className={s.tabs} role="tablist">
            {tabs
              .filter((t) => !t.hidden)
              .map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`${s.tab} ${tab === t.id ? s.tabActive : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
          </div>
          <div className={s.paneBody}>
            {tab === 'requirements' && (
              <>
                {!mock && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {meta.concepts.map((c) => (
                      <span key={c} className={s.conceptChip}>
                        {c}
                      </span>
                    ))}
                  </div>
                )}
                <p className={s.muted} style={{ marginTop: 0, fontSize: 12 }}>
                  Code in <code>{entry.srcPath}/</code> · {meta.minutes} min
                  {meta.companies.length > 0 && !mock && <> · Asked at {meta.companies.join(', ')}</>}
                </p>
                <Markdown>{body}</Markdown>
              </>
            )}
            {tab === 'followups' && <FollowUps taskId={meta.id} items={followUps} />}
            {tab === 'tests' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className={s.card}>
                  <p style={{ marginTop: 0 }}>
                    Delete the <code>NOT_STARTED</code> export in your Solution file, then run:
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <pre className={s.codeBlock} style={{ flex: 1, margin: 0 }}>
                      {testCommand}
                    </pre>
                    <button className={s.btn} onClick={() => navigator.clipboard.writeText(testCommand)}>
                      Copy
                    </button>
                  </div>
                  <p className={s.muted} style={{ marginBottom: 0, fontSize: 12 }}>
                    Tests use only roles, labels and text from the README's Test contract, so any correct implementation
                    passes. <code>npm run test:ui</code> opens the Vitest UI.
                  </p>
                </div>
                <AsyncCode load={loadTestsAsFiles(entry.loadTestSource)} />
              </div>
            )}
            {tab === 'notes' && <NotesEditor taskId={meta.id} />}
            {tab === 'design' && entry.design && (
              <>
                <p className={s.muted} style={{ marginTop: 0 }}>
                  Fill this in <code>{entry.srcPath}/DESIGN.md</code> in your editor. Practice explaining it out loud in 5
                  minutes.
                </p>
                <Markdown>{entry.design}</Markdown>
              </>
            )}
            {tab === 'reference' && progress.revealedEver && <AsyncCode load={entry.loadReferenceSource} />}
            {tab === 'history' && <History taskId={meta.id} />}
          </div>
        </section>

        <PreviewPane entry={entry} />
      </div>
    </div>
  );
}

const testLoaders = new WeakMap<() => Promise<string>, () => Promise<{ file: string; code: string }[]>>();
function loadTestsAsFiles(load: () => Promise<string>) {
  let wrapped = testLoaders.get(load);
  if (!wrapped) {
    wrapped = async () => [{ file: 'task.test.tsx', code: await load() }];
    testLoaders.set(load, wrapped);
  }
  return wrapped;
}

function History({ taskId }: { taskId: string }) {
  const progress = useTaskProgress(taskId);
  if (progress.attempts.length === 0) {
    return <p className={s.muted}>No attempts logged yet. Use the timer's Finish button to log one.</p>;
  }
  return (
    <div>
      {progress.nextReview && (
        <p>
          Next revisit: <strong>{progress.nextReview}</strong>
        </p>
      )}
      <ul className={s.list}>
        {[...progress.attempts].reverse().map((a) => (
          <li key={a.finishedAt} className={s.row}>
            <span className={s.code}>{new Date(a.finishedAt).toLocaleString()}</span>
            <span>{a.minutes} min</span>
            <span className={s.muted}>{a.status}</span>
            {a.revealed && <span className={s.badge}>used reference</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
