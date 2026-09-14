import type { ReactNode } from 'react';

export interface ModalProps {
  /** Controlled visibility. When false, nothing is rendered. */
  open: boolean;
  /** Called when the user asks to close: Escape, the Close button, or a backdrop click. */
  onClose: () => void;
  /** Visible heading text. Also the dialog's accessible name. */
  title: string;
  children?: ReactNode;
  /** Whether clicking the backdrop calls onClose. Default true. */
  closeOnBackdropClick?: boolean;
}
