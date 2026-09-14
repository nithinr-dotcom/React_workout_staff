export type FolderId = 'inbox' | 'sent' | 'archive';

export const FOLDERS: { id: FolderId; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'sent', label: 'Sent' },
  { id: 'archive', label: 'Archive' },
];

export interface Email {
  /** Unique, stable id. */
  id: string;
  folder: FolderId;
  from: string;
  to: string;
  subject: string;
  body: string;
  /** ISO timestamp. Lists are sorted newest first. */
  sentAt: string;
  read: boolean;
}

export interface EmailClientProps {
  /** Initial mailbox contents. Read once on mount; after that the component owns the state. */
  initialEmails: Email[];
}
