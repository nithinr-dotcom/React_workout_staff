import { setConfidence, setStatus, useTaskProgress } from '../../lib/progressStore';
import { STATUS_LABEL, type Status } from '../../lib/types';
import s from '../shell.module.css';

export function StatusControls({ taskId }: { taskId: string }) {
  const progress = useTaskProgress(taskId);

  return (
    <>
      <select
        className={s.select}
        style={{ width: 'auto' }}
        value={progress.status}
        onChange={(e) => setStatus(taskId, e.target.value as Status)}
        aria-label="Status"
      >
        {(Object.keys(STATUS_LABEL) as Status[]).map((st) => (
          <option key={st} value={st}>
            {STATUS_LABEL[st]}
          </option>
        ))}
      </select>
      <div className={s.confidence} role="group" aria-label="Confidence">
        <span className={s.muted} style={{ fontSize: 12, marginRight: 4 }}>
          Confidence
        </span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            className={`${s.confidenceBtn} ${progress.confidence === n ? s.confidenceBtnActive : ''}`}
            onClick={() => setConfidence(taskId, n)}
            aria-pressed={progress.confidence === n}
            title={['', 'Could not do it', 'Needed lots of help', 'Got there slowly', 'Comfortable', 'Could teach it'][n]}
          >
            {n}
          </button>
        ))}
      </div>
    </>
  );
}
