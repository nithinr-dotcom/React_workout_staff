import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ROADMAP } from '../lib/roadmap';
import { allTasks } from '../lib/taskRegistry';
import { useLabState } from '../lib/progressStore';
import { STATUS_LABEL } from '../lib/types';
import s from './shell.module.css';

const byCode = new Map(allTasks.map((t) => [t.meta.code, t]));

export function Roadmap() {
  const state = useLabState();
  const [concept, setConcept] = useState('');

  const concepts = useMemo(() => {
    const map = new Map<string, typeof allTasks>();
    for (const t of allTasks) {
      for (const c of t.meta.concepts) {
        const key = c.toLowerCase();
        map.set(key, [...(map.get(key) ?? []), t]);
      }
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, []);

  const filteredConcepts = concept ? concepts.filter(([c]) => c.includes(concept.toLowerCase())) : concepts.slice(0, 40);

  return (
    <div className={s.page}>
      <div>
        <h1 className={s.h1}>Roadmap</h1>
        <p className={s.muted} style={{ margin: '4px 0 0' }}>
          Ordered so each phase builds the concepts the next one assumes. See <code>docs/ROADMAP.md</code> for the weekly
          routine.
        </p>
      </div>

      {ROADMAP.map((phase) => {
        const tasks = phase.codes.map((c) => byCode.get(c)).filter((t) => t !== undefined);
        const done = tasks.filter((t) => ['solved', 'solved-with-help'].includes(state.tasks[t.meta.id]?.status ?? '')).length;
        return (
          <section key={phase.title} className={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <h2 className={s.h2} style={{ margin: 0 }}>
                {phase.title}
              </h2>
              <span className={s.muted}>
                {phase.weeks} · {done}/{tasks.length}
              </span>
            </div>
            <p className={s.muted} style={{ margin: '4px 0 10px' }}>
              {phase.goal}
            </p>
            <div className={s.bar} style={{ marginBottom: 10 }}>
              <div className={s.barFill} style={{ width: `${tasks.length ? (done / tasks.length) * 100 : 0}%` }} />
            </div>
            <ul className={s.list} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {tasks.map((t) => {
                const st = state.tasks[t.meta.id]?.status ?? 'todo';
                return (
                  <li key={t.meta.id}>
                    <Link to={`/tasks/${t.meta.id}`} className={s.row} title={STATUS_LABEL[st]}>
                      <span className={`${s.dot} ${s[`dot-${st}`] ?? ''}`} />
                      <span className={s.code}>{t.meta.code}</span>
                      <span style={{ flex: 1 }}>{t.meta.title}</span>
                      {t.meta.star && <span className={s.star}>★</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className={s.card}>
        <h2 className={s.h2}>Concept index</h2>
        <input
          className={s.input}
          placeholder="Find a concept (e.g. abort, focus, virtualization)…"
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          aria-label="Find concept"
          style={{ marginBottom: 12 }}
        />
        <ul className={s.list}>
          {filteredConcepts.map(([c, tasks]) => (
            <li key={c} className={s.row} style={{ alignItems: 'flex-start' }}>
              <span style={{ minWidth: 200, fontWeight: 600 }}>{c}</span>
              <span style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tasks.map((t) => (
                  <Link key={t.meta.id} to={`/tasks/${t.meta.id}`} className={s.conceptChip}>
                    {t.meta.code} {t.meta.title}
                  </Link>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
