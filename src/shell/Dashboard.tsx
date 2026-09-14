import { useMemo, useRef } from 'react';
import { Link } from 'react-router';
import { allTasks } from '../lib/taskRegistry';
import { exportState, importState, isDue, resetAll, today, useLabState } from '../lib/progressStore';
import { LEVEL_LABEL, LEVELS, STATUS_LABEL, TRACK_LABEL, trackOf, type Track } from '../lib/types';
import s from './shell.module.css';

const isSolved = (status?: string) => status === 'solved' || status === 'solved-with-help';

function streak(days: string[]) {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(today())) d.setDate(d.getDate() - 1);
  let count = 0;
  while (set.has(d.toLocaleDateString('en-CA'))) {
    count++;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

export function Dashboard() {
  const state = useLabState();
  const fileInput = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const progressList = Object.values(state.tasks);
    const minutes = progressList.reduce((sum, p) => sum + p.attempts.reduce((m, a) => m + a.minutes, 0), 0);
    const solved = allTasks.filter((t) => isSolved(state.tasks[t.meta.id]?.status)).length;
    const due = allTasks.filter((t) => state.tasks[t.meta.id] && isDue(state.tasks[t.meta.id]));
    const recent = allTasks
      .flatMap((t) => (state.tasks[t.meta.id]?.attempts ?? []).map((a) => ({ entry: t, attempt: a })))
      .sort((a, b) => b.attempt.finishedAt.localeCompare(a.attempt.finishedAt))
      .slice(0, 8);
    return { minutes, solved, due, recent, streak: streak(state.activity) };
  }, [state]);

  const download = () => {
    const blob = new Blob([exportState()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `machine-coding-lab-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const upload = async (file: File) => {
    try {
      importState(await file.text());
      alert('Progress imported.');
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const stars = allTasks.filter((t) => t.meta.star);

  return (
    <div className={s.page}>
      <div>
        <h1 className={s.h1}>Machine Coding Lab</h1>
        <p className={s.muted} style={{ margin: '4px 0 0' }}>
          Code it yourself, run the tests, then compare. No AI autocomplete in this workspace.
        </p>
      </div>

      <div className={`${s.card} ${s.stats}`}>
        <div className={s.stat}>
          <strong>
            {stats.solved}/{allTasks.length}
          </strong>
          <span className={s.muted}>tasks solved</span>
        </div>
        <div className={s.stat}>
          <strong>{Math.round((stats.minutes / 60) * 10) / 10}h</strong>
          <span className={s.muted}>logged practice</span>
        </div>
        <div className={s.stat}>
          <strong>{stats.streak}🔥</strong>
          <span className={s.muted}>day streak</span>
        </div>
        <div className={s.stat}>
          <strong>{stats.due.length}</strong>
          <span className={s.muted}>due for revisit</span>
        </div>
      </div>

      <div className={s.grid3}>
        {LEVELS.map((level) => {
          const tasks = allTasks.filter((t) => t.meta.level === level);
          const solved = tasks.filter((t) => isSolved(state.tasks[t.meta.id]?.status)).length;
          const next = tasks.find((t) => !isSolved(state.tasks[t.meta.id]?.status));
          const tracks = [...new Set(tasks.map((t) => trackOf(t.meta.kind)))] as Track[];
          return (
            <div key={level} className={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className={`${s.badge} ${s[level]}`}>{LEVEL_LABEL[level]}</span>
                <span className={s.muted}>
                  {solved}/{tasks.length}
                </span>
              </div>
              <div className={s.bar}>
                <div className={s.barFill} style={{ width: `${tasks.length ? (solved / tasks.length) * 100 : 0}%` }} />
              </div>
              <ul className={s.list} style={{ margin: '12px 0' }}>
                {tracks.map((track) => {
                  const inTrack = tasks.filter((t) => trackOf(t.meta.kind) === track);
                  const done = inTrack.filter((t) => isSolved(state.tasks[t.meta.id]?.status)).length;
                  return (
                    <li key={track} className={s.row} style={{ padding: '2px 0' }}>
                      <span style={{ flex: 1 }}>{TRACK_LABEL[track]}</span>
                      <span className={s.muted}>
                        {done}/{inTrack.length}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {next ? (
                <Link to={`/tasks/${next.meta.id}`} className={`${s.btn} ${s.btnPrimary}`}>
                  Next: {next.meta.code} {next.meta.title}
                </Link>
              ) : (
                <span className={s.muted}>Level complete 🎉</span>
              )}
            </div>
          );
        })}
      </div>

      <div className={s.grid2}>
        <div className={s.card}>
          <h2 className={s.h2}>Due for revisit</h2>
          {stats.due.length === 0 ? (
            <p className={s.muted}>Nothing due. Solved tasks come back after 3, 7, 21 and 45 days.</p>
          ) : (
            <ul className={s.list}>
              {stats.due.map((t) => (
                <li key={t.meta.id}>
                  <Link to={`/tasks/${t.meta.id}`} className={s.row}>
                    <span className={s.code}>{t.meta.code}</span>
                    <span style={{ flex: 1 }}>{t.meta.title}</span>
                    <span className={s.muted}>{state.tasks[t.meta.id].nextReview}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={s.card}>
          <h2 className={s.h2}>★ Most asked ({stars.length})</h2>
          <ul className={s.list}>
            {stars.map((t) => {
              const st = state.tasks[t.meta.id]?.status ?? 'todo';
              return (
                <li key={t.meta.id}>
                  <Link to={`/tasks/${t.meta.id}`} className={s.row}>
                    <span className={`${s.dot} ${s[`dot-${st}`] ?? ''}`} />
                    <span className={s.code}>{t.meta.code}</span>
                    <span style={{ flex: 1 }}>{t.meta.title}</span>
                    <span className={s.muted}>{STATUS_LABEL[st]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className={s.card}>
          <h2 className={s.h2}>Recent attempts</h2>
          {stats.recent.length === 0 ? (
            <p className={s.muted}>Start a timer on any task, then press Finish to log an attempt.</p>
          ) : (
            <ul className={s.list}>
              {stats.recent.map(({ entry, attempt }) => (
                <li key={entry.meta.id + attempt.finishedAt}>
                  <Link to={`/tasks/${entry.meta.id}`} className={s.row}>
                    <span className={s.code}>{entry.meta.code}</span>
                    <span style={{ flex: 1 }}>{entry.meta.title}</span>
                    <span className={s.muted}>
                      {attempt.minutes}m · {STATUS_LABEL[attempt.status]}
                      {attempt.revealed ? ' · ref' : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={s.card}>
          <h2 className={s.h2}>Your data</h2>
          <p className={s.muted} style={{ marginTop: 0 }}>
            Progress and notes live in this browser's localStorage. Export regularly (or commit the JSON).
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className={s.btn} onClick={download}>
              Export JSON
            </button>
            <button className={s.btn} onClick={() => fileInput.current?.click()}>
              Import JSON
            </button>
            <button
              className={`${s.btn} ${s.btnDanger}`}
              onClick={() => window.confirm('Delete all progress and notes?') && resetAll()}
            >
              Reset everything
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
