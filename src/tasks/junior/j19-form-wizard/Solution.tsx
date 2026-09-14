import type { FormWizardProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function FormWizard({ onSubmit }: FormWizardProps) {
  // Your implementation here. Requirements are in README.md.
  void onSubmit;
  return <div className={styles.root}>FormWizard: start coding in Solution.tsx</div>;
}
