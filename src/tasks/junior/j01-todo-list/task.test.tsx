import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import { TODO_STORAGE_KEY, type Todo } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const TodoApp = impl.default;

const newInput = () => screen.getByRole('textbox', { name: 'New todo' });
const checkbox = (title: string) => screen.getByRole('checkbox', { name: title });
const queryTodo = (title: string) => screen.queryByRole('checkbox', { name: title });

async function setup(titles: string[] = []) {
  const user = userEvent.setup();
  render(<TodoApp />);
  for (const title of titles) {
    await user.type(newInput(), `${title}{Enter}`);
  }
  return user;
}

function seed(todos: Todo[]) {
  localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
}

describeTask('Todo List', () => {
  it('shows the empty state, then adds trimmed todos on Enter and clears the input', async () => {
    const user = await setup();
    expect(screen.getByText('Nothing to do yet')).toBeInTheDocument();
    await user.type(newInput(), '   Buy milk  {Enter}');
    expect(checkbox('Buy milk')).not.toBeChecked();
    expect(newInput()).toHaveValue('');
    expect(screen.queryByText('Nothing to do yet')).not.toBeInTheDocument();
  });

  it('ignores blank input', async () => {
    const user = await setup(['Buy milk']);
    await user.type(newInput(), '   {Enter}');
    expect(screen.getAllByRole('button', { name: /^Delete / })).toHaveLength(1);
  });

  it('toggles completion and keeps the items-left counter in sync', async () => {
    const user = await setup(['Buy milk', 'Walk dog']);
    expect(screen.getByText('2 items left')).toBeInTheDocument();
    await user.click(checkbox('Buy milk'));
    expect(checkbox('Buy milk')).toBeChecked();
    expect(screen.getByText('1 item left')).toBeInTheDocument();
    await user.click(checkbox('Walk dog'));
    expect(screen.getByText('0 items left')).toBeInTheDocument();
  });

  it('filters by All / Active / Completed with aria-pressed', async () => {
    const user = await setup(['Buy milk', 'Walk dog']);
    await user.click(checkbox('Buy milk'));

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: 'Active' }));
    expect(screen.getByRole('button', { name: 'Active' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
    expect(queryTodo('Buy milk')).not.toBeInTheDocument();
    expect(queryTodo('Walk dog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(queryTodo('Buy milk')).toBeInTheDocument();
    expect(queryTodo('Walk dog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(queryTodo('Buy milk')).toBeInTheDocument();
    expect(queryTodo('Walk dog')).toBeInTheDocument();
  });

  it('edits via the Edit button: Enter saves the trimmed value', async () => {
    const user = await setup(['Buy milk']);
    await user.click(screen.getByRole('button', { name: 'Edit Buy milk' }));
    const edit = screen.getByRole('textbox', { name: 'Edit todo' });
    expect(edit).toHaveValue('Buy milk');
    expect(edit).toHaveFocus();
    await user.clear(edit);
    await user.type(edit, ' Buy oat milk {Enter}');
    expect(screen.queryByRole('textbox', { name: 'Edit todo' })).not.toBeInTheDocument();
    expect(checkbox('Buy oat milk')).toBeInTheDocument();
    expect(queryTodo('Buy milk')).not.toBeInTheDocument();
  });

  it('Escape cancels an edit', async () => {
    const user = await setup(['Buy milk']);
    await user.click(screen.getByRole('button', { name: 'Edit Buy milk' }));
    const edit = screen.getByRole('textbox', { name: 'Edit todo' });
    await user.clear(edit);
    await user.type(edit, 'Something else{Escape}');
    expect(screen.queryByRole('textbox', { name: 'Edit todo' })).not.toBeInTheDocument();
    expect(checkbox('Buy milk')).toBeInTheDocument();
    expect(queryTodo('Something else')).not.toBeInTheDocument();
  });

  it('double-clicking the title starts editing, and blur saves', async () => {
    const user = await setup(['Buy milk']);
    await user.dblClick(screen.getByText('Buy milk'));
    const edit = screen.getByRole('textbox', { name: 'Edit todo' });
    await user.clear(edit);
    await user.type(edit, 'Buy bread');
    await user.click(newInput());
    expect(checkbox('Buy bread')).not.toBeChecked();
  });

  it('saving an empty title deletes the todo', async () => {
    const user = await setup(['Buy milk', 'Walk dog']);
    await user.click(screen.getByRole('button', { name: 'Edit Buy milk' }));
    await user.clear(screen.getByRole('textbox', { name: 'Edit todo' }));
    await user.keyboard('{Enter}');
    expect(queryTodo('Buy milk')).not.toBeInTheDocument();
    expect(queryTodo('Walk dog')).toBeInTheDocument();
  });

  it('deletes a todo, and Clear completed removes only completed todos', async () => {
    const user = await setup(['Buy milk', 'Walk dog', 'Read book']);
    await user.click(screen.getByRole('button', { name: 'Delete Walk dog' }));
    expect(queryTodo('Walk dog')).not.toBeInTheDocument();

    expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();
    await user.click(checkbox('Buy milk'));
    await user.click(screen.getByRole('button', { name: 'Clear completed' }));
    expect(queryTodo('Buy milk')).not.toBeInTheDocument();
    expect(queryTodo('Read book')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Clear completed' })).not.toBeInTheDocument();
  });

  it('persists to localStorage and restores on remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<TodoApp />);
    await user.type(newInput(), 'Buy milk{Enter}');
    await user.click(checkbox('Buy milk'));

    const saved = JSON.parse(localStorage.getItem(TODO_STORAGE_KEY) ?? 'null') as Todo[];
    expect(saved).toEqual([expect.objectContaining({ title: 'Buy milk', completed: true })]);
    expect(typeof saved[0].id).toBe('string');

    unmount();
    render(<TodoApp />);
    expect(checkbox('Buy milk')).toBeChecked();
  });

  it('loads seeded todos and survives corrupt storage', () => {
    seed([
      { id: 'a', title: 'Seeded one', completed: false },
      { id: 'b', title: 'Seeded two', completed: true },
    ]);
    const { unmount } = render(<TodoApp />);
    expect(checkbox('Seeded one')).not.toBeChecked();
    expect(checkbox('Seeded two')).toBeChecked();
    expect(screen.getByText('1 item left')).toBeInTheDocument();
    unmount();

    localStorage.setItem(TODO_STORAGE_KEY, 'not json');
    render(<TodoApp />);
    expect(screen.getByText('Nothing to do yet')).toBeInTheDocument();
  });
});
