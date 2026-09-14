// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { CheckboxNode } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const NestedCheckboxes = impl.default;

const nodes: CheckboxNode[] = [
  {
    id: 'fe',
    label: 'Frontend',
    children: [
      { id: 'react', label: 'React' },
      { id: 'vue', label: 'Vue' },
      { id: 'svelte', label: 'Svelte' },
    ],
  },
  {
    id: 'be',
    label: 'Backend',
    children: [
      {
        id: 'node',
        label: 'Node.js',
        children: [
          { id: 'express', label: 'Express' },
          { id: 'fastify', label: 'Fastify' },
        ],
      },
      { id: 'go', label: 'Go' },
    ],
  },
  { id: 'docs', label: 'Docs' },
  { id: 'mobile', label: 'Mobile', children: [] },
];

const box = (name: string) => screen.getByRole('checkbox', { name });

function expectState(name: string, state: 'checked' | 'mixed' | 'unchecked') {
  const el = box(name);
  if (state === 'checked') {
    expect(el).toBeChecked();
    expect(el).not.toBePartiallyChecked();
  } else if (state === 'mixed') {
    expect(el).toBePartiallyChecked();
    expect(el).not.toBeChecked();
  } else {
    expect(el).not.toBeChecked();
    expect(el).not.toBePartiallyChecked();
  }
}

describeTask('NestedCheckboxes', () => {
  it('renders a checkbox per node, all unchecked and expanded by default', () => {
    render(<NestedCheckboxes nodes={nodes} />);
    for (const name of ['Frontend', 'React', 'Vue', 'Svelte', 'Backend', 'Node.js', 'Express', 'Fastify', 'Go', 'Docs', 'Mobile']) {
      expectState(name, 'unchecked');
    }
    expect(screen.getByRole('button', { name: 'Toggle Backend' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('button', { name: 'Toggle Docs' })).not.toBeInTheDocument();
  });

  it('checking a parent checks every descendant', async () => {
    const user = userEvent.setup();
    render(<NestedCheckboxes nodes={nodes} />);
    await user.click(box('Backend'));
    for (const name of ['Backend', 'Node.js', 'Express', 'Fastify', 'Go']) expectState(name, 'checked');
    expectState('Frontend', 'unchecked');
  });

  it('unchecking a checked parent clears every descendant', async () => {
    const user = userEvent.setup();
    render(<NestedCheckboxes nodes={nodes} />);
    await user.click(box('Backend'));
    await user.click(box('Backend'));
    for (const name of ['Backend', 'Node.js', 'Express', 'Fastify', 'Go']) expectState(name, 'unchecked');
  });

  it('checks a parent once all of its children are checked', async () => {
    const user = userEvent.setup();
    render(<NestedCheckboxes nodes={nodes} />);
    await user.click(box('React'));
    await user.click(box('Vue'));
    expectState('Frontend', 'mixed');
    await user.click(box('Svelte'));
    expectState('Frontend', 'checked');
  });

  it('propagates the indeterminate state through every ancestor', async () => {
    const user = userEvent.setup();
    render(<NestedCheckboxes nodes={nodes} />);
    await user.click(box('Express'));
    expectState('Node.js', 'mixed');
    expectState('Backend', 'mixed');
    await user.click(box('Fastify'));
    expectState('Node.js', 'checked');
    expectState('Backend', 'mixed');
  });

  it('unchecking one child of a checked parent makes the ancestors indeterminate', async () => {
    const user = userEvent.setup();
    render(<NestedCheckboxes nodes={nodes} />);
    await user.click(box('Backend'));
    await user.click(box('Fastify'));
    expectState('Node.js', 'mixed');
    expectState('Backend', 'mixed');
    expectState('Go', 'checked');
  });

  it('clicking an indeterminate parent selects all of its descendants', async () => {
    const user = userEvent.setup();
    render(<NestedCheckboxes nodes={nodes} />);
    await user.click(box('Go'));
    expectState('Backend', 'mixed');
    await user.click(box('Backend'));
    for (const name of ['Backend', 'Node.js', 'Express', 'Fastify', 'Go']) expectState(name, 'checked');
  });

  it('derives parent state from defaultSelectedIds', () => {
    render(<NestedCheckboxes nodes={nodes} defaultSelectedIds={['react', 'vue', 'svelte', 'express']} />);
    expectState('Frontend', 'checked');
    expectState('Express', 'checked');
    expectState('Node.js', 'mixed');
    expectState('Backend', 'mixed');
    expectState('Go', 'unchecked');
  });

  it('treats a node with an empty children array as a leaf', async () => {
    const user = userEvent.setup();
    render(<NestedCheckboxes nodes={nodes} />);
    await user.click(box('Mobile'));
    expectState('Mobile', 'checked');
  });

  it('reports selected leaf ids in tree order after each change, not on mount', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NestedCheckboxes nodes={nodes} defaultSelectedIds={['docs']} onChange={onChange} />);
    expect(onChange).not.toHaveBeenCalled();
    await user.click(box('Go'));
    expect(onChange).toHaveBeenLastCalledWith(['go', 'docs']);
    await user.click(box('Frontend'));
    expect(onChange).toHaveBeenLastCalledWith(['react', 'vue', 'svelte', 'go', 'docs']);
    await user.click(box('Node.js'));
    expect(onChange).toHaveBeenLastCalledWith(['react', 'vue', 'svelte', 'express', 'fastify', 'go', 'docs']);
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('collapses and expands children while keeping their selection', async () => {
    const user = userEvent.setup();
    render(<NestedCheckboxes nodes={nodes} />);
    await user.click(box('Express'));
    const toggle = screen.getByRole('button', { name: 'Toggle Backend' });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('checkbox', { name: 'Express' })).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Go' })).not.toBeInTheDocument();
    expectState('Backend', 'mixed');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expectState('Express', 'checked');
    expectState('Node.js', 'mixed');
  });
});
