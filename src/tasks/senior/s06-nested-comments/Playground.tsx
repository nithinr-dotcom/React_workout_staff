import type { ComponentType } from 'react';
import { COMMENTS } from '../../../mocks/data/datasets';
import type { CommentNode, NestedCommentsProps } from './types';

// A deeper thread so indentation and collapsing are worth looking at.
const DEEP: CommentNode[] = [
  {
    id: 'd1', author: 'you', text: 'Should we move the design system to CSS layers?', createdAt: '2026-09-01T08:00:00Z', votes: 4,
    replies: [
      {
        id: 'd2', author: 'mei', text: 'Yes, it finally fixes specificity fights with product teams.', createdAt: '2026-09-01T08:10:00Z', votes: 6,
        replies: [
          {
            id: 'd3', author: 'you', text: 'Browser support is fine for our matrix?', createdAt: '2026-09-01T08:20:00Z', votes: 1,
            replies: [
              { id: 'd4', author: 'mei', text: 'Everything we support has had it for two years.', createdAt: '2026-09-01T08:25:00Z', votes: 3, replies: [] },
            ],
          },
        ],
      },
      { id: 'd5', author: 'arjun', text: 'Only if we ship a codemod with it.', createdAt: '2026-09-01T09:00:00Z', votes: 2, replies: [] },
    ],
  },
];

export default function Playground({ impl }: { impl: { default: ComponentType<NestedCommentsProps> } }) {
  const NestedComments = impl.default;
  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 720 }}>
      <section>
        <h3>COMMENTS dataset (signed in as priya)</h3>
        <NestedComments initialComments={COMMENTS} currentUser="priya" />
      </section>
      <section>
        <h3>Deep thread (signed in as you)</h3>
        <NestedComments initialComments={DEEP} currentUser="you" />
      </section>
      <section>
        <h3>Empty</h3>
        <NestedComments initialComments={[]} currentUser="you" />
      </section>
    </div>
  );
}
