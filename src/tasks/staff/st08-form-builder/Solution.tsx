import type { FormBuilderProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function FormBuilder({ schema, onSubmit, fieldRegistry, initialValues }: FormBuilderProps) {
  // Your implementation here. Requirements are in README.md.
  void onSubmit;
  void fieldRegistry;
  void initialValues;
  return (
    <div className={styles.root}>
      FormBuilder with {schema.fields.length} top-level fields: start coding in Solution.tsx
    </div>
  );
}
