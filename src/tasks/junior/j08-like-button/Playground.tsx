import { useState, type ComponentType } from 'react';
import { toggleLike } from '../../../mocks/api';
import type { LikeButtonProps } from './types';

export default function Playground({ impl }: { impl: { default: ComponentType<LikeButtonProps> } }) {
  const LikeButton = impl.default;
  const [failRate, setFailRate] = useState(0.2);
  const [log, setLog] = useState<string[]>([]);

  const onToggle = (postId: number) => async (liked: boolean) => {
    const at = new Date().toLocaleTimeString();
    try {
      await toggleLike(postId, liked, { failRate, latency: [400, 1200] });
      setLog((l) => [`${at} post ${postId} → ${liked ? 'liked' : 'unliked'} ✓`, ...l].slice(0, 10));
    } catch (e) {
      setLog((l) => [`${at} post ${postId} → ${liked ? 'liked' : 'unliked'} ✗ ${(e as Error).message}`, ...l].slice(0, 10));
      throw e;
    }
  };

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
      <label>
        Failure rate: {Math.round(failRate * 100)}%{' '}
        <input type="range" min={0} max={1} step={0.1} value={failRate} onChange={(e) => setFailRate(Number(e.target.value))} />
      </label>
      <section>
        <h3>Not liked yet, 41 likes</h3>
        <LikeButton initialCount={41} onToggle={onToggle(1)} />
      </section>
      <section>
        <h3>Already liked, 1 like</h3>
        <LikeButton initialLiked initialCount={1} onToggle={onToggle(2)} />
      </section>
      <section>
        <h3>Request log</h3>
        <ol style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {log.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
