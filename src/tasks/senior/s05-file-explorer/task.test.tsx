import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { FILE_TREE } from '../../../mocks/data/datasets';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const FileExplorer = impl.default;

const item = (name: string) => screen.getByRole('treeitem', { name });
const queryItem = (name: string) => screen.queryByRole('treeitem', { name });
/** Asserts the visible treeitems appear in exactly this order (by accessible name). */
const expectOrder = (names: string[]) => {
  expect(screen.getAllByRole('treeitem')).toEqual(names.map((n) => item(n)));
};

describeTask('FileExplorer', () => {
  it('renders root items sorted folders-first then case-insensitive alphabetical, folders collapsed', () => {
    render(<FileExplorer initialTree={FILE_TREE} />);
    expect(screen.getByRole('tree', { name: 'Files' })).toBeInTheDocument();
    expectOrder(['public', 'src', 'package.json', 'README.md']);
    expect(item('src')).toHaveAttribute('aria-expanded', 'false');
    expect(item('src')).toHaveAttribute('aria-level', '1');
    expect(item('package.json')).not.toHaveAttribute('aria-expanded');
    expect(queryItem('App.tsx')).not.toBeInTheDocument();
  });

  it('toggles a folder on click and shows sorted children with aria-level', async () => {
    const user = userEvent.setup();
    render(<FileExplorer initialTree={FILE_TREE} />);
    await user.click(item('src'));
    expect(item('src')).toHaveAttribute('aria-expanded', 'true');
    expectOrder(['public', 'src', 'components', 'hooks', 'App.tsx', 'main.tsx', 'package.json', 'README.md']);
    expect(item('App.tsx')).toHaveAttribute('aria-level', '2');
    await user.click(item('src'));
    expect(item('src')).toHaveAttribute('aria-expanded', 'false');
    expect(queryItem('App.tsx')).not.toBeInTheDocument();
  });

  it('selects a file on click and Enter, calling onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FileExplorer initialTree={FILE_TREE} onSelect={onSelect} />);
    await user.click(item('package.json'));
    expect(item('package.json')).toHaveAttribute('aria-selected', 'true');
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'package.json', name: 'package.json', type: 'file' }));

    item('README.md').focus();
    await user.keyboard('{Enter}');
    expect(item('README.md')).toHaveAttribute('aria-selected', 'true');
    expect(item('package.json')).toHaveAttribute('aria-selected', 'false');
    expect(onSelect).toHaveBeenCalledTimes(2);
  });

  it('uses a roving tabindex with exactly one tabbable item', async () => {
    const user = userEvent.setup();
    render(<FileExplorer initialTree={FILE_TREE} />);
    const tabbable = () => screen.getAllByRole('treeitem').filter((el) => el.tabIndex === 0);
    expect(tabbable()).toEqual([item('public')]);
    item('public').focus();
    await user.keyboard('{ArrowDown}');
    expect(item('src')).toHaveFocus();
    expect(tabbable()).toEqual([item('src')]);
  });

  it('supports ArrowUp/Down/Right/Left, Home and End per the tree pattern', async () => {
    const user = userEvent.setup();
    render(<FileExplorer initialTree={FILE_TREE} />);
    item('public').focus();
    await user.keyboard('{ArrowDown}');
    expect(item('src')).toHaveFocus();

    await user.keyboard('{ArrowRight}'); // expand
    expect(item('src')).toHaveAttribute('aria-expanded', 'true');
    expect(item('src')).toHaveFocus();

    await user.keyboard('{ArrowRight}'); // first child
    expect(item('components')).toHaveFocus();

    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(item('App.tsx')).toHaveFocus();

    await user.keyboard('{ArrowLeft}'); // file → parent
    expect(item('src')).toHaveFocus();

    await user.keyboard('{ArrowLeft}'); // open folder → collapse
    expect(item('src')).toHaveAttribute('aria-expanded', 'false');
    expect(item('src')).toHaveFocus();

    await user.keyboard('{End}');
    expect(item('README.md')).toHaveFocus();
    await user.keyboard('{ArrowDown}'); // no wrap
    expect(item('README.md')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(item('public')).toHaveFocus();
  });

  it('creates a file inside a collapsed folder, expanding it and keeping sort order', async () => {
    const user = userEvent.setup();
    render(<FileExplorer initialTree={FILE_TREE} />);
    await user.click(screen.getByRole('button', { name: 'New file in src' }));
    expect(item('src')).toHaveAttribute('aria-expanded', 'true');
    const input = screen.getByRole('textbox', { name: 'New file name' });
    expect(input).toHaveFocus();
    await user.type(input, 'index.ts{Enter}');

    expect(screen.queryByRole('textbox', { name: 'New file name' })).not.toBeInTheDocument();
    expect(item('index.ts')).toHaveAttribute('aria-level', '2');
    expectOrder(['public', 'src', 'components', 'hooks', 'App.tsx', 'index.ts', 'main.tsx', 'package.json', 'README.md']);
  });

  it('creates a folder at the root; Escape cancels creation', async () => {
    const user = userEvent.setup();
    render(<FileExplorer initialTree={FILE_TREE} />);
    await user.click(screen.getByRole('button', { name: 'New folder at root' }));
    await user.type(screen.getByRole('textbox', { name: 'New folder name' }), 'docs{Enter}');
    expect(item('docs')).toHaveAttribute('aria-expanded', 'false');
    expectOrder(['docs', 'public', 'src', 'package.json', 'README.md']);

    await user.click(screen.getByRole('button', { name: 'New file at root' }));
    await user.type(screen.getByRole('textbox', { name: 'New file name' }), 'tmp.txt{Escape}');
    expect(screen.queryByRole('textbox', { name: 'New file name' })).not.toBeInTheDocument();
    expect(queryItem('tmp.txt')).not.toBeInTheDocument();
  });

  it('rejects a duplicate sibling name (case-insensitive) and keeps the input open', async () => {
    const user = userEvent.setup();
    render(<FileExplorer initialTree={FILE_TREE} />);
    await user.click(screen.getByRole('button', { name: 'New file at root' }));
    const input = screen.getByRole('textbox', { name: 'New file name' });
    await user.type(input, 'readme.md{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);
    expect(screen.getByRole('textbox', { name: 'New file name' })).toBeInTheDocument();
    expect(screen.getAllByRole('treeitem')).toHaveLength(4);
  });

  it('renames inline, re-sorts, and Escape cancels a rename', async () => {
    const user = userEvent.setup();
    render(<FileExplorer initialTree={FILE_TREE} defaultExpandedIds={['src']} />);
    await user.click(screen.getByRole('button', { name: 'Rename App.tsx' }));
    const input = screen.getByRole('textbox', { name: 'New name for App.tsx' });
    expect(input).toHaveValue('App.tsx');
    expect(input).toHaveFocus();
    await user.clear(input);
    await user.type(input, 'Zed.tsx{Enter}');
    expect(queryItem('App.tsx')).not.toBeInTheDocument();
    expectOrder(['public', 'src', 'components', 'hooks', 'main.tsx', 'Zed.tsx', 'package.json', 'README.md']);

    await user.click(screen.getByRole('button', { name: 'Rename main.tsx' }));
    const second = screen.getByRole('textbox', { name: 'New name for main.tsx' });
    await user.clear(second);
    await user.type(second, 'other.tsx{Escape}');
    expect(item('main.tsx')).toBeInTheDocument();
    expect(queryItem('other.tsx')).not.toBeInTheDocument();
  });

  it('renaming a folder keeps its children and expanded state', async () => {
    const user = userEvent.setup();
    render(<FileExplorer initialTree={FILE_TREE} defaultExpandedIds={['src', 'src/components']} />);
    await user.click(screen.getByRole('button', { name: 'Rename components' }));
    const input = screen.getByRole('textbox', { name: 'New name for components' });
    await user.clear(input);
    await user.type(input, 'ui{Enter}');
    expect(item('ui')).toHaveAttribute('aria-expanded', 'true');
    expect(item('Button.tsx')).toHaveAttribute('aria-level', '3');
  });

  it('deletes only after confirmation, removing a folder with all descendants', async () => {
    const user = userEvent.setup();
    render(<FileExplorer initialTree={FILE_TREE} defaultExpandedIds={['src', 'src/components']} />);

    await user.click(screen.getByRole('button', { name: 'Delete src' }));
    let dialog = screen.getByRole('alertdialog', { name: 'Delete src?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(item('Button.tsx')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete src' }));
    dialog = screen.getByRole('alertdialog', { name: 'Delete src?' });
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete src' }));
    dialog = screen.getByRole('alertdialog', { name: 'Delete src?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(queryItem('src')).not.toBeInTheDocument();
    expect(queryItem('Button.tsx')).not.toBeInTheDocument();
    expectOrder(['public', 'package.json', 'README.md']);
    expect(document.body).not.toHaveFocus();
  });

  it('renders "No files" for an empty tree', () => {
    render(<FileExplorer initialTree={[]} />);
    expect(screen.getByText('No files')).toBeInTheDocument();
  });
});
