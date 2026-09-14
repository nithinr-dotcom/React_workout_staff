import { unlockFollowUp, useTaskProgress } from '../../lib/progressStore';
import { Markdown } from './Markdown';
import s from '../shell.module.css';

export function FollowUps({ taskId, items }: { taskId: string; items: string[] }) {
  const { followUpsUnlocked } = useTaskProgress(taskId);
  const unlocked = Math.min(followUpsUnlocked, items.length);

  if (items.length === 0) {
    return <p className={s.muted}>No follow-ups for this task.</p>;
  }

  return (
    <div>
      <p className={s.muted} style={{ marginTop: 0 }}>
        Interviewers change requirements mid-round. Unlock one only after the base version works, then extend your code
        without rewriting it.
      </p>
      {items.slice(0, unlocked).map((item, i) => (
        <div key={i} className={s.followUp}>
          <Markdown>{`**Follow-up ${i + 1}.** ${item}`}</Markdown>
        </div>
      ))}
      {unlocked < items.length ? (
        <div className={`${s.followUp} ${s.followUpLocked}`}>
          <p style={{ margin: '0 0 8px' }}>
            {items.length - unlocked} follow-up{items.length - unlocked > 1 ? 's' : ''} locked
          </p>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={() => unlockFollowUp(taskId)}>
            Unlock follow-up {unlocked + 1}
          </button>
        </div>
      ) : (
        <p className={s.muted}>All follow-ups unlocked.</p>
      )}
    </div>
  );
}
