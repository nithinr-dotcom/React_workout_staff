import { useState } from 'react';
import { useNavigate } from 'react-router';
import { allTasks } from '../lib/taskRegistry';
import { isDue, useLabState } from '../lib/progressStore';
import { LEVEL_LABEL, LEVELS, TRACK_LABEL, trackOf, type Level, type Track } from '../lib/types';
import s from './shell.module.css';

export function MockInterview() {
  const state = useLabState();
  const navigate = useNavigate();
  const [level, setLevel] = useState<Level>('senior');
  const [track, setTrack] = useState<Track | 'any'>('any');
  const [pool, setPool] = useState<'unsolved' | 'revisit' | 'any'>('unsolved');

  const candidates = allTasks.filter(({ meta }) => {
    if (meta.level !== level) return false;
    if (track !== 'any' && trackOf(meta.kind) !== track) return false;
    const p = state.tasks[meta.id];
    if (pool === 'unsolved') return !p || !['solved', 'solved-with-help'].includes(p.status);
    if (pool === 'revisit') return p && (isDue(p) || p.status === 'revisit' || p.status === 'solved-with-help');
    return true;
  });

  const start = () => {
    // Weight frequently-asked tasks higher.
    const weighted = candidates.flatMap((t) => Array(t.meta.star ? 3 : t.meta.frequency === 'very-common' ? 2 : 1).fill(t));
    const pick = weighted[Math.floor(Math.random() * weighted.length)];
    navigate(`/tasks/${pick.meta.id}?mock=1`);
  };

  return (
    <div className={s.page} style={{ maxWidth: 720 }}>
      <div>
        <h1 className={s.h1}>Mock interview</h1>
        <p className={s.muted} style={{ margin: '4px 0 0' }}>
          A random task with the clock already running. Treat it like the real thing.
        </p>
      </div>

      <div className={s.card} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Level</div>
          <div className={s.segmented}>
            {LEVELS.map((l) => (
              <button key={l} className={`${s.segment} ${level === l ? s.segmentActive : ''}`} onClick={() => setLevel(l)}>
                {LEVEL_LABEL[l]}
              </button>
            ))}
          </div>
        </label>
        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Track</div>
          <select className={s.select} value={track} onChange={(e) => setTrack(e.target.value as Track | 'any')}>
            <option value="any">Any</option>
            {(Object.keys(TRACK_LABEL) as Track[]).map((t) => (
              <option key={t} value={t}>
                {TRACK_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Pool</div>
          <select className={s.select} value={pool} onChange={(e) => setPool(e.target.value as typeof pool)}>
            <option value="unsolved">Not solved yet</option>
            <option value="revisit">Due / needs revisit</option>
            <option value="any">Anything</option>
          </select>
        </label>
        <button className={`${s.btn} ${s.btnPrimary}`} onClick={start} disabled={candidates.length === 0} style={{ alignSelf: 'flex-start' }}>
          Start a random task ({candidates.length} available)
        </button>
      </div>

      <div className={s.card}>
        <h2 className={s.h2}>How to run it</h2>
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>Spend the first 5–10 minutes on clarifying questions and a component sketch. Write them in Notes.</li>
          <li>Talk out loud (or record your screen). Explain tradeoffs as you make them.</li>
          <li>Get a working base version before styling or edge cases.</li>
          <li>With 15 minutes left, unlock a follow-up and extend without rewriting.</li>
          <li>Run the tests, press Finish, and only then compare with the reference.</li>
        </ol>
      </div>
    </div>
  );
}
