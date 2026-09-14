// Reference solution not written yet.
import type { ReactNode } from 'react';
import type { ToastApi } from './types';

export const NOT_IMPLEMENTED = true;
export default function Reference() {
  return null;
}

// Stubs so the Playground and tests can import this module without crashing.
export function ToastProvider({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}
export function useToast(): ToastApi {
  return { show: () => '', dismiss: () => {} };
}
