// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Email } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const EmailClient = impl.default;

// Deliberately not in date order: the component sorts newest first.
const EMAILS: Email[] = [
  { id: 'e3', folder: 'inbox', from: 'Billing', to: 'Me', subject: 'Your invoice', body: 'Invoice attached for September.', sentAt: '2026-09-12T08:00:00Z', read: true },
  { id: 'e1', folder: 'inbox', from: 'Priya Nair', to: 'Me', subject: 'Quarterly report', body: 'Numbers look good this quarter.', sentAt: '2026-09-14T09:00:00Z', read: false },
  { id: 'e5', folder: 'sent', from: 'Me', to: 'Ana Souza', subject: 'Design review', body: 'Notes from today.', sentAt: '2026-09-11T10:00:00Z', read: true },
  { id: 'e2', folder: 'inbox', from: 'Marco Rossi', to: 'Me', subject: 'Lunch on Friday', body: 'New pasta place near the office?', sentAt: '2026-09-13T12:30:00Z', read: false },
  { id: 'e6', folder: 'archive', from: 'Newsletter', to: 'Me', subject: 'Old newsletter', body: 'Top stories from August.', sentAt: '2026-09-01T07:00:00Z', read: false },
  { id: 'e4', folder: 'inbox', from: 'HR Team', to: 'Me', subject: 'Welcome aboard', body: 'Glad to have you with us.', sentAt: '2026-09-10T15:00:00Z', read: true },
];

function setup(options?: Parameters<typeof userEvent.setup>[0]) {
  const user = userEvent.setup(options);
  render(<EmailClient initialEmails={structuredClone(EMAILS)} />);
  return { user };
}

const folder = (label: string) =>
  within(screen.getByRole('navigation', { name: 'Folders' })).getByRole('button', { name: new RegExp(`^${label}`) });
const messageList = () => screen.getByRole('list', { name: 'Messages' });
const messageButtons = () => within(messageList()).queryAllByRole('button');
const message = (subject: string) => within(messageList()).getByRole('button', { name: new RegExp(subject) });
const hasMessage = (subject: string) => within(messageList()).queryByRole('button', { name: new RegExp(subject) }) !== null;
const readingPane = () => screen.getByRole('region', { name: 'Reading pane' });

function expectOrder(subjects: string[]) {
  const buttons = messageButtons();
  expect(buttons).toHaveLength(subjects.length);
  subjects.forEach((s, i) => expect(buttons[i].textContent).toContain(s));
}

describeTask('EmailClient', () => {
  it('shows folders with unread counts and the inbox newest first', () => {
    setup();
    expect(folder('Inbox')).toHaveAttribute('aria-current', 'page');
    expect(folder('Inbox')).toHaveTextContent('2');
    expect(folder('Sent')).not.toHaveTextContent(/\d/);
    expect(folder('Archive')).toHaveTextContent('1');
    expectOrder(['Quarterly report', 'Lunch on Friday', 'Your invoice', 'Welcome aboard']);
    expect(readingPane()).toHaveTextContent('No message selected');
    expect(screen.getByRole('checkbox', { name: 'Select Quarterly report' })).not.toBeChecked();
  });

  it('opens a clicked message in the reading pane and marks it read', async () => {
    const { user } = setup();
    await user.click(message('Quarterly report'));
    expect(within(readingPane()).getByRole('heading', { name: 'Quarterly report' })).toBeInTheDocument();
    expect(readingPane()).toHaveTextContent('Numbers look good this quarter.');
    expect(readingPane()).toHaveTextContent('Priya Nair');
    expect(folder('Inbox')).toHaveTextContent('1');
    expect(folder('Inbox')).not.toHaveTextContent('2');
  });

  it('switches folders, moving aria-current and clearing the open message', async () => {
    const { user } = setup();
    await user.click(message('Lunch on Friday'));
    await user.click(folder('Sent'));
    expect(folder('Sent')).toHaveAttribute('aria-current', 'page');
    expect(folder('Inbox')).not.toHaveAttribute('aria-current', 'page');
    expectOrder(['Design review']);
    expect(readingPane()).toHaveTextContent('No message selected');
    await user.click(folder('Archive'));
    expectOrder(['Old newsletter']);
  });

  it('moves focus with j/k and arrow keys without wrapping, and opens with Enter', async () => {
    const { user } = setup();
    message('Quarterly report').focus();
    await user.keyboard('j');
    expect(message('Lunch on Friday')).toHaveFocus();
    await user.keyboard('{ArrowDown}j');
    expect(message('Welcome aboard')).toHaveFocus();
    await user.keyboard('j');
    expect(message('Welcome aboard')).toHaveFocus();
    await user.keyboard('k{ArrowUp}');
    expect(message('Lunch on Friday')).toHaveFocus();
    // Moving focus does not open or mark read.
    expect(readingPane()).toHaveTextContent('No message selected');
    expect(folder('Inbox')).toHaveTextContent('2');
    await user.keyboard('{Enter}');
    expect(within(readingPane()).getByRole('heading', { name: 'Lunch on Friday' })).toBeInTheDocument();
    expect(folder('Inbox')).toHaveTextContent('1');
  });

  it('archives the focused message with e and focuses the next one', async () => {
    const { user } = setup();
    message('Lunch on Friday').focus();
    await user.keyboard('e');
    expect(hasMessage('Lunch on Friday')).toBe(false);
    expect(message('Your invoice')).toHaveFocus();
    // The unread message moved, so the counts move with it.
    expect(folder('Inbox')).toHaveTextContent('1');
    expect(folder('Archive')).toHaveTextContent('2');
    await user.click(folder('Archive'));
    expectOrder(['Lunch on Friday', 'Old newsletter']);
  });

  it('does nothing on e inside Archive', async () => {
    const { user } = setup();
    await user.click(folder('Archive'));
    message('Old newsletter').focus();
    await user.keyboard('e');
    expectOrder(['Old newsletter']);
  });

  it('deletes with #, focusing the previous message after the last, then the search box when empty', async () => {
    const { user } = setup();
    message('Welcome aboard').focus();
    await user.keyboard('#');
    expect(hasMessage('Welcome aboard')).toBe(false);
    expect(message('Your invoice')).toHaveFocus();
    await user.keyboard('###');
    expect(messageButtons()).toHaveLength(0);
    expect(screen.getByText('No messages')).toBeInTheDocument();
    expect(screen.getByLabelText('Search mail')).toHaveFocus();
    expect(folder('Inbox')).not.toHaveTextContent(/\d/);
    // Deleted, not archived.
    expect(folder('Archive')).toHaveTextContent('1');
  });

  it('clears the reading pane when the open message is archived', async () => {
    const { user } = setup();
    await user.click(message('Quarterly report'));
    expect(within(readingPane()).getByRole('heading', { name: 'Quarterly report' })).toBeInTheDocument();
    message('Quarterly report').focus();
    await user.keyboard('e');
    expect(readingPane()).toHaveTextContent('No message selected');
  });

  it('bulk archives checked messages; x toggles the focused checkbox', async () => {
    const { user } = setup();
    const bulk = screen.getByRole('button', { name: /^Archive selected/ });
    expect(bulk).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: 'Select Quarterly report' }));
    message('Your invoice').focus();
    await user.keyboard('x');
    expect(screen.getByRole('checkbox', { name: 'Select Your invoice' })).toBeChecked();
    const enabled = screen.getByRole('button', { name: /^Archive selected/ });
    expect(enabled).toBeEnabled();
    await user.click(enabled);
    expectOrder(['Lunch on Friday', 'Welcome aboard']);
    expect(screen.getByRole('button', { name: /^Archive selected/ })).toBeDisabled();
    expect(folder('Archive')).toHaveTextContent('2');
    await user.click(folder('Archive'));
    expectOrder(['Quarterly report', 'Your invoice', 'Old newsletter']);
  });

  it('filters the current folder by subject, sender or body without triggering shortcuts', async () => {
    const { user } = setup();
    const search = screen.getByLabelText('Search mail');
    await user.type(search, 'MARCO');
    expectOrder(['Lunch on Friday']);
    await user.clear(search);
    await user.type(search, 'invoice attached');
    expectOrder(['Your invoice']);
    await user.clear(search);
    await user.type(search, 'e');
    expect(messageButtons().length).toBeGreaterThan(0);
    expect(folder('Archive')).toHaveTextContent('1');
    await user.type(search, 'zzz');
    expect(screen.getByText('No messages')).toBeInTheDocument();
    // Counts ignore the search.
    expect(folder('Inbox')).toHaveTextContent('2');
  });
});

describeFollowUp(2, 'undo archive', () => {
  it('shows an Undo toast that restores the message, and hides it after 5 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user } = setup({ advanceTimers: vi.advanceTimersByTime });
    message('Lunch on Friday').focus();
    await user.keyboard('e');
    expect(hasMessage('Lunch on Friday')).toBe(false);
    const toast = screen.getAllByRole('status').find((el) => el.textContent?.includes('Message archived'))!;
    expect(toast).toBeTruthy();
    await user.click(within(toast).getByRole('button', { name: 'Undo' }));
    expectOrder(['Quarterly report', 'Lunch on Friday', 'Your invoice', 'Welcome aboard']);
    expect(folder('Archive')).toHaveTextContent('1');

    message('Your invoice').focus();
    await user.keyboard('e');
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5100);
    });
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(hasMessage('Your invoice')).toBe(false);
  });
});
