// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { ModalProps } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Modal = impl.default;

function Harness({ closeOnBackdropClick, onCloseSpy }: { closeOnBackdropClick?: boolean; onCloseSpy?: () => void }) {
  const [open, setOpen] = useState(false);
  const props: ModalProps = {
    open,
    title: 'Settings',
    closeOnBackdropClick,
    onClose: () => {
      onCloseSpy?.();
      setOpen(false);
    },
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open settings
      </button>
      <a href="#outside">Outside link</a>
      <Modal {...props}>
        <label>
          Name <input />
        </label>
        <button type="button">Save</button>
      </Modal>
    </>
  );
}

async function openModal(props: Parameters<typeof Harness>[0] = {}) {
  const user = userEvent.setup();
  const utils = render(<Harness {...props} />);
  await user.click(screen.getByRole('button', { name: 'Open settings' }));
  const dialog = screen.getByRole('dialog', { name: 'Settings' });
  return { user, dialog, ...utils };
}

afterEach(() => {
  document.body.style.overflow = '';
});

describeTask('Modal', () => {
  it('renders nothing while closed and a labelled modal dialog when open', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open settings' }));
    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('renders into a portal on document.body', async () => {
    const { dialog, container } = await openModal();
    expect(container).not.toContainElement(dialog);
    expect(document.body).toContainElement(dialog);
  });

  it('moves focus inside the dialog when it opens', async () => {
    const { dialog } = await openModal();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('traps Tab inside the dialog', async () => {
    const { user, dialog } = await openModal();
    for (let i = 0; i < 8; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('traps Shift+Tab inside the dialog', async () => {
    const { user, dialog } = await openModal();
    for (let i = 0; i < 8; i++) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('visits every focusable element when tabbing around the trap', async () => {
    const { user, dialog } = await openModal();
    const seen = new Set<Element | null>();
    for (let i = 0; i < 6; i++) {
      await user.tab();
      seen.add(document.activeElement);
    }
    expect(seen).toContain(within(dialog).getByRole('button', { name: 'Close' }));
    expect(seen).toContain(within(dialog).getByRole('button', { name: 'Save' }));
    expect(seen).toContain(within(dialog).getByRole('textbox', { name: 'Name' }));
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const onCloseSpy = vi.fn();
    const { user } = await openModal({ onCloseSpy });
    await user.keyboard('{Escape}');
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus();
  });

  it('closes with the Close button', async () => {
    const onCloseSpy = vi.fn();
    const { user, dialog } = await openModal({ onCloseSpy });
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open settings' })).toHaveFocus();
  });

  it('closes on backdrop click but not on clicks inside the dialog', async () => {
    const onCloseSpy = vi.fn();
    const { user, dialog } = await openModal({ onCloseSpy });
    await user.click(within(dialog).getByRole('textbox', { name: 'Name' }));
    await user.click(dialog);
    expect(onCloseSpy).not.toHaveBeenCalled();
    await user.click(dialog.parentElement!);
    expect(onCloseSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('ignores backdrop clicks when closeOnBackdropClick is false', async () => {
    const onCloseSpy = vi.fn();
    const { user, dialog } = await openModal({ onCloseSpy, closeOnBackdropClick: false });
    await user.click(dialog.parentElement!);
    expect(onCloseSpy).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  });

  it('locks body scroll while open and restores the previous value', async () => {
    document.body.style.overflow = 'scroll';
    const { user } = await openModal();
    expect(document.body.style.overflow).toBe('hidden');
    await user.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('releases the scroll lock when unmounted while open', () => {
    const { unmount } = render(
      <Modal open onClose={() => {}} title="Settings">
        <button type="button">Save</button>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
