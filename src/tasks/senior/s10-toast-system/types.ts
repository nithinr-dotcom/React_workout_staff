import type { ReactNode } from 'react';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  /** Default 'info'. */
  type?: ToastType;
  /** Auto-dismiss delay in ms. Defaults to the provider's `defaultDuration`. `0` means it stays until dismissed. */
  duration?: number;
}

export interface ToastApi {
  /** Shows (or queues) a toast and returns its id. */
  show: (options: ToastOptions) => string;
  /** Removes a visible or queued toast. Unknown ids are ignored. */
  dismiss: (id: string) => void;
}

export interface ToastProviderProps {
  children?: ReactNode;
  /** Maximum toasts on screen at once. The rest wait in a FIFO queue. Default 3. */
  maxVisible?: number;
  /** Default auto-dismiss delay in ms. Default 5000. */
  defaultDuration?: number;
}

export interface ToastModule {
  ToastProvider: (props: ToastProviderProps) => ReactNode;
  useToast: () => ToastApi;
}
