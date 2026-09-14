import { useMemo, useState } from 'react';
import { NavLink, useParams } from 'react-router';
import { allTasks, getTask } from '../lib/taskRegistry';
import { useLabState } from '../lib/progressStore';
import { LEVEL_LABEL, LEVELS, STATUS_LABEL, TRACK_LABEL, trackOf, type Level, type Status, type Track } from '../lib/types';
import s from './shell.module.css';

const LEVEL_KEY = 'mc-lab:sidebar-level';

export function Sidebar() {
  const { taskId } = useParams();
  const state = useLabState();
  const [level, setLevel] = useState<Level>(() => {
    const fromRoute = taskId ? getTask(taskId)?.meta.level : undefined;
    return fromRoute ?? (localStorage.getItem(LEVEL_KEY) as Level | null) ?? 'junior';
  });
  const [track, setTrack] = useState<Track | 'all'>('all');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [query, setQuery] = useState('');
  const [starOnly, setStarOnly] = useState(false);

  // Follow the route when navigating to a task from another level. Adjusting state during render is
  // React's recommended alternative to an effect here.
  const routeLevel = taskId ? getTask(taskId)?.meta.level : undefined;
  const [lastRouteLevel, setLastRouteLevel] = useState(routeLevel);
  if (routeLevel !== lastRouteLevel) {
    setLastRouteLevel(routeLevel);
    if (routeLevel) setLevel(routeLevel);
  }

  const chooseLevel = (l: Level) => {
    setLevel(l);
    localStorage.setItem(LEVEL_KEY, l);
  };

  const tasks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allTasks.filter(({ meta }) => {
      if (meta.level !== level) return false;
      if (track !== 'all' && trackOf(meta.kind) !== track) return false;
      if (starOnly && !meta.star) return false;
      const st = state.tasks[meta.id]?.status ?? 'todo';
      if (status !== 'all' && st !== status) return false;
      if (!q) return true;
      return (
        meta.title.toLowerCase().includes(q) ||
        meta.code.toLowerCase().includes(q) ||
        meta.concepts.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [level, track, status, query, starOnly, state]);

  const levelCounts = useMemo(
    () =>
      Object.fromEntries(
        LEVELS.map((l) => {
          const inLevel = allTasks.filter((t) => t.meta.level === l);
          const done = inLevel.filter((t) => ['solved', 'solved-with-help'].includes(state.tasks[t.meta.id]?.status ?? '')).length;
          return [l, `${done}/${inLevel.length}`];
        }),
      ),
    [state],
  );

  const tracksInLevel = useMemo(
    () => [...new Set(allTasks.filter((t) => t.meta.level === level).map((t) => trackOf(t.meta.kind)))],
    [level],
  );

  return (
    <aside className={s.sidebar}>
      <div className={s.sidebarHead}>
        <div className={s.segmented} role="tablist" aria-label="Level">
          {LEVELS.map((l) => (
            <button
              key={l}
              role="tab"
              aria-selected={level === l}
              className={`${s.segment} ${level === l ? s.segmentActive : ''}`}
              onClick={() => chooseLevel(l)}
              title={`${levelCounts[l]} solved`}
            >
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
        <input
          className={s.input}
          placeholder="Search title, code or concept…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tasks"
        />
        <div className={s.chips}>
          <button className={`${s.chip} ${track === 'all' ? s.chipActive : ''}`} onClick={() => setTrack('all')}>
            All
          </button>
          {tracksInLevel.map((t) => (
            <button key={t} className={`${s.chip} ${track === t ? s.chipActive : ''}`} onClick={() => setTrack(t)}>
              {TRACK_LABEL[t]}
            </button>
          ))}
          <button className={`${s.chip} ${starOnly ? s.chipActive : ''}`} onClick={() => setStarOnly((v) => !v)}>
            ★ Most asked
          </button>
        </div>
        <select
          className={s.select}
          value={status}
          onChange={(e) => setStatus(e.target.value as Status | 'all')}
          aria-label="Filter by status"
        >
          <option value="all">Any status</option>
          {(Object.keys(STATUS_LABEL) as Status[]).map((st) => (
            <option key={st} value={st}>
              {STATUS_LABEL[st]}
            </option>
          ))}
        </select>
      </div>

      <ul className={s.taskList}>
        {tasks.map(({ meta }) => {
          const st = state.tasks[meta.id]?.status ?? 'todo';
          return (
            <li key={meta.id}>
              <NavLink
                to={`/tasks/${meta.id}`}
                className={({ isActive }) => `${s.taskItem} ${isActive ? s.taskItemActive : ''}`}
                title={meta.summary}
              >
                <span className={`${s.dot} ${s[`dot-${st}`] ?? ''}`} title={STATUS_LABEL[st]} />
                <span className={s.code}>{meta.code}</span>
                <span className={s.taskTitle}>{meta.title}</span>
                {meta.star ? <span className={s.star}>★</span> : <span />}
              </NavLink>
            </li>
          );
        })}
        {tasks.length === 0 && <li className={s.muted} style={{ padding: 12 }}>No tasks match.</li>}
      </ul>
      <div className={s.sidebarFoot}>
        {levelCounts[level]} solved in {LEVEL_LABEL[level]}
      </div>
    </aside>
  );
}
