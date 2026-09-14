// Sample mailbox for the Playground. Tests use their own small fixture.
import type { Email, FolderId } from './types';

const PEOPLE = ['Priya Nair', 'Marco Rossi', 'Ana Souza', 'Kenji Tanaka', 'Fatima Zahra', 'Liam O’Brien', 'Billing', 'GitHub', 'HR Team'];
const SUBJECTS = [
  'Quarterly report draft',
  'Lunch on Friday?',
  'Your invoice #4821',
  'Design review notes',
  'Re: Flaky test in CI',
  'Offsite agenda',
  'PR #1289 approved',
  'Password expires soon',
  'Welcome to the team!',
  'Budget sign-off needed',
  'Re: Customer escalation',
  'Weekly metrics',
];
const BODIES = [
  'Hi, attaching the latest version. Let me know if the numbers look off before Thursday.',
  'Are you free for lunch this Friday? The new place near the office has good reviews.',
  'Thanks for your payment. Your invoice is attached for your records.',
  'Summary: we agreed to simplify the settings page and drop the second modal.',
  'I reran the job three times and it only fails on the Linux runner. Any ideas?',
];

function build(count: number): Email[] {
  const start = Date.parse('2026-09-14T18:00:00Z');
  return Array.from({ length: count }, (_, i) => {
    const folder: FolderId = i % 7 === 3 ? 'sent' : i % 9 === 5 ? 'archive' : 'inbox';
    const person = PEOPLE[i % PEOPLE.length];
    return {
      id: `m${i + 1}`,
      folder,
      from: folder === 'sent' ? 'Me' : person,
      to: folder === 'sent' ? person : 'Me',
      subject: SUBJECTS[i % SUBJECTS.length] + (i >= SUBJECTS.length ? ` (${Math.floor(i / SUBJECTS.length) + 1})` : ''),
      body: BODIES[i % BODIES.length],
      sentAt: new Date(start - i * 97 * 60_000).toISOString(),
      read: folder === 'sent' || i % 3 === 0,
    };
  });
}

export const SAMPLE_EMAILS: Email[] = build(40);
