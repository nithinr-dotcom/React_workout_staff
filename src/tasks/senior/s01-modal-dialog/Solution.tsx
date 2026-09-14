import type { ModalProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function Modal({ open, onClose, title, children, closeOnBackdropClick = true }: ModalProps) {
  // Your implementation here. Requirements are in README.md.
  void onClose;
  void closeOnBackdropClick;
  if (!open) return null;
  return (
    <div className={styles.root}>
      Modal "{title}": start coding in Solution.tsx
      {children}
    </div>
  );
}
