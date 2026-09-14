import { Suspense, useState } from 'react';
import { elapsedMs, hideReference, revealReference, useTaskProgress } from '../../lib/progressStore';
import { getPreview, type PreviewTarget, type TaskEntry } from '../../lib/taskRegistry';
import { ErrorBoundary } from './ErrorBoundary';
import s from '../shell.module.css';

const VIEWPORTS = [
  { label: 'Full', width: '100%' },
  { label: '768', width: '768px' },
  { label: '375', width: '375px' },
] as const;

export function PreviewPane({ entry }: { entry: TaskEntry }) {
  const { meta } = entry;
  const progress = useTaskProgress(meta.id);
  const [target, setTarget] = useState<PreviewTarget>('solution');
  const [viewport, setViewport] = useState<(typeof VIEWPORTS)[number]['width']>('100%');
  const [mountKey, setMountKey] = useState(0);

  const revealed = progress.revealedEver;
  const showGate = target === 'reference' && !revealed;
  const Preview = getPreview(entry, target);

  const reveal = () => {
    const usedRatio = elapsedMs(progress) / (meta.minutes * 60_000);
    if (usedRatio < 0.7) {
      const ok = window.confirm(
        `You've used ${Math.round(usedRatio * 100)}% of the ${meta.minutes} min time box.\n\n` +
          'Struggling is where the learning happens. Reveal the reference anyway?\n' +
          '(This attempt will be logged as "solved with help".)',
      );
      if (!ok) return;
    }
    revealReference(meta.id);
  };

  return (
    <section className={s.pane} aria-label="Preview">
      <div className={s.previewBar}>
        <div className={s.segmented}>
          {(['solution', 'reference'] as const).map((t) => (
            <button
              key={t}
              className={`${s.segment} ${target === t ? s.segmentActive : ''}`}
              onClick={() => setTarget(t)}
              aria-pressed={target === t}
            >
              {t === 'solution' ? 'Yours' : revealed ? 'Reference' : '🔒 Reference'}
            </button>
          ))}
        </div>
        <div className={s.segmented}>
          {VIEWPORTS.map((v) => (
            <button
              key={v.label}
              className={`${s.segment} ${viewport === v.width ? s.segmentActive : ''}`}
              onClick={() => setViewport(v.width)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <span className={s.spacer} />
        {revealed && (
          <button
            className={`${s.btn} ${s.btnSmall}`}
            onClick={() => {
              hideReference(meta.id);
              setTarget('solution');
            }}
            title="Lock the reference again before a fresh attempt"
          >
            🙈 Hide reference
          </button>
        )}
        <button className={`${s.btn} ${s.btnSmall}`} onClick={() => setMountKey((k) => k + 1)} title="Unmount and mount again">
          ↻ Remount
        </button>
      </div>

      <div className={s.previewStage}>
        {showGate ? (
          <div className={s.gate}>
            <strong>Reference is hidden</strong>
            <p className={s.muted} style={{ margin: 0 }}>
              Try to finish your own version first. Compare afterwards to learn the gaps, not the answer.
            </p>
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={reveal}>
              Reveal reference
            </button>
          </div>
        ) : (
          <div className={s.previewFrame} style={{ maxWidth: viewport }}>
            <div className={s.previewFrameInner}>
              <ErrorBoundary key={`${target}-${mountKey}-${meta.id}`} onReset={() => setMountKey((k) => k + 1)}>
                <Suspense fallback={<div className="preview-message">Loading…</div>}>
                  <Preview />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
