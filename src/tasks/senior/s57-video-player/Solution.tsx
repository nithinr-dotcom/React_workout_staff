import type { VideoPlayerProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function VideoPlayer({ src, title, poster }: VideoPlayerProps) {
  // Your implementation here. Requirements are in README.md.
  void src;
  void poster;
  return <div className={styles.root}>Video player for &quot;{title}&quot;: start coding in Solution.tsx</div>;
}
