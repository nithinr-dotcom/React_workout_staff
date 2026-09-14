import { useEffect, useState } from 'react';
import { elapsedMs, finishAttempt, pauseTimer, resetTimer, startTimer, useTaskProgress } from '../../lib/progressStore';
import s from '../shell.module.css';

const fmt = (ms: number) => {
  const total = Math.floor(Math.abs(ms) / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${ms < 0 ? '+' : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export function Timer({ taskId, minutes }: { taskId: string; minutes: number }) {
  const progress = useTaskProgress(taskId);
  const running = progress.timerStartedAt !== null;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);

  const elapsed = elapsedMs(progress, running ? now : undefined);
  const remaining = minutes * 60_000 - elapsed;

  const finish = () => {
    const solved = window.confirm('Log this attempt.\n\nOK = I solved it\nCancel = not solved yet (mark for revisit)');
    finishAttempt(taskId, solved ? 'solved' : 'revisit');
  };

  return (
    <div className={s.timer}>
      <span
        className={`${s.timerValue} ${remaining < 0 ? s.overtime : ''}`}
        title={`Elapsed ${fmt(elapsed)} of ${minutes} min`}
        aria-live="off"
      >
        {remaining >= 0 ? fmt(remaining) : fmt(remaining)} <span className={s.muted}>/ {minutes}m</span>
      </span>
      {running ? (
        <button className={`${s.btn} ${s.btnSmall}`} onClick={() => pauseTimer(taskId)}>
          Pause
        </button>
      ) : (
        <button className={`${s.btn} ${s.btnSmall} ${s.btnPrimary}`} onClick={() => startTimer(taskId)}>
          {elapsed > 0 ? 'Resume' : 'Start'}
        </button>
      )}
      <button className={`${s.btn} ${s.btnSmall}`} onClick={() => resetTimer(taskId)} disabled={elapsed === 0}>
        Reset
      </button>
      <button className={`${s.btn} ${s.btnSmall}`} onClick={finish} disabled={elapsed === 0} title="Log attempt">
        Finish
      </button>
    </div>
  );
}
