import type { ToastApi, ToastOptions, ToastProviderProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export function ToastProvider({ children, maxVisible = 3, defaultDuration = 5000 }: ToastProviderProps) {
  // Your implementation here. Requirements are in README.md.
  void maxVisible;
  void defaultDuration;
  return (
    <>
      {children}
      <div className={styles.root}>ToastProvider: start coding in Solution.tsx</div>
    </>
  );
}

export function useToast(): ToastApi {
  // Your implementation here.
  return {
    show: (options: ToastOptions) => {
      void options;
      throw new Error('useToast().show: not implemented');
    },
    dismiss: (id: string) => {
      void id;
      throw new Error('useToast().dismiss: not implemented');
    },
  };
}

export default ToastProvider;
