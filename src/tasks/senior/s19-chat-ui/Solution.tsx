import type { ChatUIProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function ChatUI({ createSocket, maxMessages = 200, nearBottomThreshold = 80, reconnect }: ChatUIProps) {
  // Your implementation here. Requirements are in README.md.
  void createSocket;
  void maxMessages;
  void nearBottomThreshold;
  void reconnect;
  return <div className={styles.root}>Chat UI: start coding in Solution.tsx</div>;
}
