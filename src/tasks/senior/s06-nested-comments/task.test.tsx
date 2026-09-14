import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { COMMENTS } from '../../../mocks/data/datasets';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { CommentNode } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const NestedComments = impl.default;

const NOW = () => new Date('2026-09-10T12:00:00Z');

const C1 = 'Is virtualization worth it for a 500-row table?';
const C2 = 'Measure first. 500 simple rows usually render fine.';
const C3 = 'They each have 3 inputs and a menu though.';
const C4 = 'content-visibility: auto is a cheap first step.';
const C5 = 'Anyone tried the new View Transitions API in production?';

/** The article of the comment with this exact text. Articles don't contain their replies (see Test contract). */
const comment = (text: string) => {
  const found = screen.getAllByRole('article').find((a) => within(a).queryByText(text));
  if (!found) throw new Error(`No comment article with text "${text}"`);
  return found;
};
const queryComment = (text: string) => screen.queryAllByRole('article').find((a) => within(a).queryByText(text));
const expectOrder = (texts: string[]) => {
  expect(screen.getAllByRole('article')).toEqual(texts.map(comment));
};

describeTask('NestedComments', () => {
  it('renders the nested thread in Top order with votes and a comment count', () => {
    render(<NestedComments initialComments={COMMENTS} currentUser="me" now={NOW} />);
    expect(screen.getByRole('heading', { name: '5 comments' })).toBeInTheDocument();
    expectOrder([C1, C2, C3, C4, C5]);
    const first = comment(C1);
    expect(within(first).getByText('priya')).toBeInTheDocument();
    expect(within(first).getByText('12 votes')).toBeInTheDocument();
    expect(within(comment(C3)).getByText('2 votes')).toBeInTheDocument();
  });

  it('sorts every level by Newest', async () => {
    const user = userEvent.setup();
    render(<NestedComments initialComments={COMMENTS} currentUser="me" now={NOW} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Newest');
    expectOrder([C5, C1, C4, C2, C3]);
  });

  it('replies to a nested comment inline', async () => {
    const user = userEvent.setup();
    render(<NestedComments initialComments={COMMENTS} currentUser="me" now={NOW} />);
    await user.click(within(comment(C2)).getByRole('button', { name: 'Reply' }));

    const box = screen.getByRole('textbox', { name: 'Reply to ben' });
    expect(box).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Post reply' })).toBeDisabled();
    await user.type(box, 'Profile it in the React DevTools.');
    await user.click(screen.getByRole('button', { name: 'Post reply' }));

    expect(screen.queryByRole('textbox', { name: 'Reply to ben' })).not.toBeInTheDocument();
    const reply = comment('Profile it in the React DevTools.');
    expect(within(reply).getByText('me')).toBeInTheDocument();
    expect(within(reply).getByText('0 votes')).toBeInTheDocument();
    expectOrder([C1, C2, C3, 'Profile it in the React DevTools.', C4, C5]);
    expect(screen.getByRole('heading', { name: '6 comments' })).toBeInTheDocument();
  });

  it('keeps a single inline form open; Escape cancels and restores focus', async () => {
    const user = userEvent.setup();
    render(<NestedComments initialComments={COMMENTS} currentUser="me" now={NOW} />);
    await user.click(within(comment(C1)).getByRole('button', { name: 'Reply' }));
    expect(screen.getByRole('textbox', { name: 'Reply to priya' })).toBeInTheDocument();

    const replyToOmar = within(comment(C5)).getByRole('button', { name: 'Reply' });
    await user.click(replyToOmar);
    expect(screen.queryByRole('textbox', { name: 'Reply to priya' })).not.toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Reply to omar' }), 'Not yet{Escape}');

    expect(screen.queryByRole('textbox', { name: 'Reply to omar' })).not.toBeInTheDocument();
    expect(queryComment('Not yet')).toBeUndefined();
    expect(replyToOmar).toHaveFocus();
  });

  it('adds a top-level comment from the composer', async () => {
    const user = userEvent.setup();
    render(<NestedComments initialComments={COMMENTS} currentUser="me" now={NOW} />);
    const composer = screen.getByRole('textbox', { name: 'Add a comment' });
    expect(screen.getByRole('button', { name: 'Post comment' })).toBeDisabled();
    await user.type(composer, '   ');
    expect(screen.getByRole('button', { name: 'Post comment' })).toBeDisabled();
    await user.type(composer, 'Great thread');
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(composer).toHaveValue('');
    expect(within(comment('Great thread')).getByText('me')).toBeInTheDocument();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Sort by' }), 'Newest');
    expect(screen.getAllByRole('article')[0]).toBe(comment('Great thread'));
  });

  it('toggles an upvote', async () => {
    const user = userEvent.setup();
    render(<NestedComments initialComments={COMMENTS} currentUser="me" now={NOW} />);
    const upvote = within(comment(C5)).getByRole('button', { name: 'Upvote' });
    expect(upvote).toHaveAttribute('aria-pressed', 'false');
    await user.click(upvote);
    expect(within(comment(C5)).getByRole('button', { name: 'Upvote' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(comment(C5)).getByText('4 votes')).toBeInTheDocument();
    await user.click(within(comment(C5)).getByRole('button', { name: 'Upvote' }));
    expect(within(comment(C5)).getByText('3 votes')).toBeInTheDocument();
  });

  it('only lets the author edit, and marks edited comments', async () => {
    const user = userEvent.setup();
    render(<NestedComments initialComments={COMMENTS} currentUser="priya" now={NOW} />);
    expect(within(comment(C2)).queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(within(comment(C2)).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();

    await user.click(within(comment(C1)).getByRole('button', { name: 'Edit' }));
    const box = screen.getByRole('textbox', { name: 'Edit comment' });
    expect(box).toHaveValue(C1);
    await user.clear(box);
    await user.type(box, 'Is virtualization worth it for 5,000 rows?');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    const edited = comment('Is virtualization worth it for 5,000 rows?');
    expect(within(edited).getByText('(edited)')).toBeInTheDocument();
    expect(queryComment(C1)).toBeUndefined();
  });

  it('removes a deleted comment that has no replies', async () => {
    const user = userEvent.setup();
    render(<NestedComments initialComments={COMMENTS} currentUser="priya" now={NOW} />);
    await user.click(within(comment(C3)).getByRole('button', { name: 'Delete' }));
    expect(queryComment(C3)).toBeUndefined();
    expect(screen.getAllByRole('article')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: '4 comments' })).toBeInTheDocument();
  });

  it('turns a deleted comment with replies into a [deleted] placeholder', async () => {
    const user = userEvent.setup();
    render(<NestedComments initialComments={COMMENTS} currentUser="priya" now={NOW} />);
    await user.click(within(comment(C1)).getByRole('button', { name: 'Delete' }));

    expect(queryComment(C1)).toBeUndefined();
    const placeholder = comment('[deleted]');
    expect(within(placeholder).queryByText('priya')).not.toBeInTheDocument();
    for (const name of ['Reply', 'Edit', 'Delete', 'Upvote']) {
      expect(within(placeholder).queryByRole('button', { name })).not.toBeInTheDocument();
    }
    expectOrder(['[deleted]', C2, C3, C4, C5]);
    expect(screen.getByRole('heading', { name: '4 comments' })).toBeInTheDocument();
  });

  it('prunes a placeholder once its last reply is deleted', async () => {
    const user = userEvent.setup();
    const thread: CommentNode[] = [
      {
        id: 'a1', author: 'me', text: 'Parent', createdAt: '2026-09-01T10:00:00Z', votes: 1,
        replies: [{ id: 'a2', author: 'me', text: 'Child', createdAt: '2026-09-01T11:00:00Z', votes: 0, replies: [] }],
      },
    ];
    render(<NestedComments initialComments={thread} currentUser="me" now={NOW} />);
    await user.click(within(comment('Parent')).getByRole('button', { name: 'Delete' }));
    expect(comment('[deleted]')).toBeInTheDocument();
    await user.click(within(comment('Child')).getByRole('button', { name: 'Delete' }));
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.getByText('No comments yet')).toBeInTheDocument();
  });

  it('collapses and expands a whole thread', async () => {
    const user = userEvent.setup();
    render(<NestedComments initialComments={COMMENTS} currentUser="me" now={NOW} />);
    const hide = within(comment(C1)).getByRole('button', { name: 'Hide replies' });
    expect(hide).toHaveAttribute('aria-expanded', 'true');
    await user.click(hide);

    for (const text of [C2, C3, C4]) expect(screen.queryByText(text)).not.toBeInTheDocument();
    const show = within(comment(C1)).getByRole('button', { name: 'Show 3 replies' });
    expect(show).toHaveAttribute('aria-expanded', 'false');
    expect(within(comment(C5)).queryByRole('button', { name: /replies/ })).not.toBeInTheDocument();

    await user.click(show);
    expectOrder([C1, C2, C3, C4, C5]);
  });

  it('renders "No comments yet" for an empty thread', () => {
    render(<NestedComments initialComments={[]} currentUser="me" now={NOW} />);
    expect(screen.getByText('No comments yet')).toBeInTheDocument();
  });
});
