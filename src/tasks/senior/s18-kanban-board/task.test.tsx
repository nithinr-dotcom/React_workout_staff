import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { BoardState } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const KanbanBoard = impl.default;

const makeBoard = (): BoardState => ({
  columnOrder: ['todo', 'doing', 'done'],
  columns: {
    todo: { id: 'todo', title: 'Todo', cardIds: ['c1', 'c2'] },
    doing: { id: 'doing', title: 'In Progress', cardIds: ['c3'] },
    done: { id: 'done', title: 'Done', cardIds: [] },
  },
  cards: {
    c1: { id: 'c1', title: 'Write spec' },
    c2: { id: 'c2', title: 'Design API' },
    c3: { id: 'c3', title: 'Build UI' },
  },
});

const column = (name: string) => screen.getByRole('region', { name });
const cardTitlesIn = (name: string) =>
  within(column(name))
    .queryAllByRole('listitem')
    .map((li) => ['Write spec', 'Design API', 'Build UI', 'Write RFC', 'Ship it'].find((t) => li.textContent?.includes(t)));

describeTask('KanbanBoard', () => {
  it('renders each column as a named region with its cards in order', () => {
    render(<KanbanBoard initialBoard={makeBoard()} />);
    expect(cardTitlesIn('Todo')).toEqual(['Write spec', 'Design API']);
    expect(cardTitlesIn('In Progress')).toEqual(['Build UI']);
    expect(within(column('Done')).getByText('No cards')).toBeInTheDocument();
  });

  it('falls back to empty Todo / In Progress / Done columns without initialBoard', () => {
    render(<KanbanBoard />);
    for (const name of ['Todo', 'In Progress', 'Done']) {
      expect(within(column(name)).getByText('No cards')).toBeInTheDocument();
    }
  });

  it('adds a card to the bottom of a column with the button and with Enter, ignoring blank titles', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard initialBoard={makeBoard()} />);
    const input = screen.getByRole('textbox', { name: 'New card in Todo' });

    await user.type(input, '   ');
    await user.click(within(column('Todo')).getByRole('button', { name: 'Add card' }));
    expect(cardTitlesIn('Todo')).toHaveLength(2);

    await user.clear(input);
    await user.type(input, '  Ship it  ');
    await user.click(within(column('Todo')).getByRole('button', { name: 'Add card' }));
    expect(cardTitlesIn('Todo')).toEqual(['Write spec', 'Design API', 'Ship it']);
    expect(input).toHaveValue('');

    await user.type(screen.getByRole('textbox', { name: 'New card in Done' }), 'Write RFC{Enter}');
    expect(cardTitlesIn('Done')).toEqual(['Write RFC']);
    expect(within(column('Done')).queryByText('No cards')).not.toBeInTheDocument();
  });

  it('renames a card inline with Enter', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard initialBoard={makeBoard()} />);
    await user.click(screen.getByRole('button', { name: 'Edit Write spec' }));
    const input = screen.getByRole('textbox', { name: 'Card title' });
    expect(input).toHaveValue('Write spec');
    await user.clear(input);
    await user.type(input, 'Write RFC{Enter}');
    expect(screen.queryByRole('textbox', { name: 'Card title' })).not.toBeInTheDocument();
    expect(within(column('Todo')).getByText('Write RFC')).toBeInTheDocument();
    expect(screen.queryByText('Write spec')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Write RFC' })).toBeInTheDocument();
  });

  it('cancels an edit with Escape and keeps the old title when saving a blank one', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard initialBoard={makeBoard()} />);

    await user.click(screen.getByRole('button', { name: 'Edit Write spec' }));
    await user.clear(screen.getByRole('textbox', { name: 'Card title' }));
    await user.type(screen.getByRole('textbox', { name: 'Card title' }), 'Nope{Escape}');
    expect(screen.queryByRole('textbox', { name: 'Card title' })).not.toBeInTheDocument();
    expect(screen.getByText('Write spec')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Edit Write spec' }));
    await user.clear(screen.getByRole('textbox', { name: 'Card title' }));
    await user.keyboard('{Enter}');
    expect(screen.getByText('Write spec')).toBeInTheDocument();
  });

  it('deletes a card', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard initialBoard={makeBoard()} />);
    await user.click(screen.getByRole('button', { name: 'Delete Build UI' }));
    expect(screen.queryByText('Build UI')).not.toBeInTheDocument();
    expect(within(column('In Progress')).getByText('No cards')).toBeInTheDocument();
  });

  it('moves a card to the bottom of another column with the Move select', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard initialBoard={makeBoard()} />);
    const select = screen.getByRole('combobox', { name: 'Move Write spec' });
    expect(select).toHaveDisplayValue('Todo');

    await user.selectOptions(select, 'In Progress');
    expect(cardTitlesIn('Todo')).toEqual(['Design API']);
    expect(cardTitlesIn('In Progress')).toEqual(['Build UI', 'Write spec']);
    expect(screen.getByRole('combobox', { name: 'Move Write spec' })).toHaveDisplayValue('In Progress');
  });

  it('keeps each card in exactly one column across several moves', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard initialBoard={makeBoard()} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Move Build UI' }), 'Done');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Move Build UI' }), 'Todo');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Move Build UI' }), 'Todo');
    expect(screen.getAllByText('Build UI')).toHaveLength(1);
    expect(cardTitlesIn('Todo')).toEqual(['Write spec', 'Design API', 'Build UI']);
    expect(within(column('In Progress')).getByText('No cards')).toBeInTheDocument();
    expect(within(column('Done')).getByText('No cards')).toBeInTheDocument();
  });

  it('persists the board to localStorage and restores it on the next mount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<KanbanBoard initialBoard={makeBoard()} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Move Write spec' }), 'Done');
    await user.click(screen.getByRole('button', { name: 'Delete Design API' }));

    const stored = JSON.parse(localStorage.getItem('kanban-board') ?? 'null') as BoardState;
    expect(stored.columns.done.cardIds).toEqual(['c1']);
    expect(stored.columns.todo.cardIds).toEqual([]);

    unmount();
    render(<KanbanBoard initialBoard={makeBoard()} />);
    expect(cardTitlesIn('Done')).toEqual(['Write spec']);
    expect(within(column('Todo')).getByText('No cards')).toBeInTheDocument();
    expect(screen.queryByText('Design API')).not.toBeInTheDocument();
  });

  it('uses a custom storageKey and prefers valid stored data over initialBoard', () => {
    const stored = makeBoard();
    stored.columns.todo.cardIds = ['c2'];
    stored.columns.done.cardIds = ['c1'];
    localStorage.setItem('my-board', JSON.stringify(stored));

    render(<KanbanBoard initialBoard={makeBoard()} storageKey="my-board" />);
    expect(cardTitlesIn('Todo')).toEqual(['Design API']);
    expect(cardTitlesIn('Done')).toEqual(['Write spec']);
    expect(localStorage.getItem('kanban-board')).toBeNull();
  });

  it('falls back to initialBoard when stored data is corrupt', () => {
    localStorage.setItem('kanban-board', '{not json');
    const { unmount } = render(<KanbanBoard initialBoard={makeBoard()} />);
    expect(cardTitlesIn('Todo')).toEqual(['Write spec', 'Design API']);
    unmount();

    localStorage.setItem('kanban-board', JSON.stringify({ hello: 'world' }));
    render(<KanbanBoard initialBoard={makeBoard()} />);
    expect(cardTitlesIn('In Progress')).toEqual(['Build UI']);
  });
});

describeFollowUp(1, 'reorder within a column', () => {
  it('moves cards up and down, disabling the buttons at the edges', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard initialBoard={makeBoard()} />);
    expect(screen.getByRole('button', { name: 'Move Write spec up' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Design API down' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Move Write spec down' }));
    expect(cardTitlesIn('Todo')).toEqual(['Design API', 'Write spec']);
    expect(screen.getByRole('button', { name: 'Move Write spec down' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Move Write spec up' }));
    expect(cardTitlesIn('Todo')).toEqual(['Write spec', 'Design API']);
    expect(screen.getByRole('button', { name: 'Move Write spec up' })).toBeDisabled();
  });

  it('keeps focus on the pressed control as the card moves', async () => {
    const user = userEvent.setup();
    render(<KanbanBoard initialBoard={makeBoard()} />);
    await user.click(screen.getByRole('button', { name: 'Move Design API up' }));
    // Now first: "up" is disabled, so focus lands on "down" of the same card.
    expect(screen.getByRole('button', { name: 'Move Design API down' })).toHaveFocus();
  });
});

describeFollowUp(4, 'cross-tab sync', () => {
  it('applies boards written to the same key by another tab', () => {
    render(<KanbanBoard initialBoard={makeBoard()} />);
    const other = makeBoard();
    other.columns.doing.cardIds = [];
    other.columns.done.cardIds = ['c3'];
    const newValue = JSON.stringify(other);
    act(() => {
      localStorage.setItem('kanban-board', newValue);
      window.dispatchEvent(new StorageEvent('storage', { key: 'kanban-board', newValue }));
    });
    expect(cardTitlesIn('Done')).toEqual(['Build UI']);
    expect(within(column('In Progress')).getByText('No cards')).toBeInTheDocument();
  });
});
