import type { CommentNode } from '../../../mocks/api';

export type { CommentNode };

export type CommentSort = 'top' | 'newest';

export interface NestedCommentsProps {
  /** Starting thread. The component owns the comments after the first render. */
  initialComments: CommentNode[];
  /** Username of the signed-in user. New comments are authored by them; only their comments can be edited or deleted. */
  currentUser: string;
  /** Clock used for `createdAt` of new comments. Default `() => new Date()`. */
  now?: () => Date;
}
