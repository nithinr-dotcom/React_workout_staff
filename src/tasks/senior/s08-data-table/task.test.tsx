import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Column } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const DataTable = impl.default;

interface Person {
  id: number;
  name: string;
  email: string;
  role: string;
  age: number;
}

const people: Person[] = [
  { id: 1, name: 'Zara Khan', email: 'zara@acme.io', role: 'Engineer', age: 34 },
  { id: 2, name: 'aaron Lee', email: 'aaron@acme.io', role: 'Designer', age: 9 },
  { id: 3, name: 'Maya Patel', email: 'maya@kite.dev', role: 'Manager', age: 100 },
  { id: 4, name: 'Ben Ode', email: 'ben@acme.io', role: 'Engineer', age: 27 },
  { id: 5, name: 'Chloe Kim', email: 'chloe@kite.dev', role: 'Designer', age: 45 },
  { id: 6, name: 'Dev Rao', email: 'dev@acme.io', role: 'Support', age: 10 },
  { id: 7, name: 'Eli Park', email: 'eli@acme.io', role: 'Engineer', age: 52 },
  { id: 8, name: 'Fay Wong', email: 'fay@kite.dev', role: 'Product', age: 31 },
  { id: 9, name: 'Gus Hale', email: 'gus@acme.io', role: 'Support', age: 23 },
  { id: 10, name: 'Hana Sato', email: 'hana@acme.io', role: 'Engineer', age: 38 },
  { id: 11, name: 'Ivan Petrov', email: 'ivan@kite.dev', role: 'Manager', age: 41 },
  { id: 12, name: 'Jo March', email: 'jo@acme.io', role: 'Designer', age: 29 },
];

const columns: Column<Person>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role', sortable: true },
  { key: 'age', header: 'Age', sortable: true, render: (p) => `${p.age} yrs` },
];

function renderTable(rows: Person[] = people) {
  return render(
    <DataTable
      caption="Team"
      columns={columns}
      rows={rows}
      filter={{ key: 'role', label: 'Role filter' }}
      pageSizeOptions={[5, 10]}
    />,
  );
}

/** First-column text of every body row. */
const names = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

const header = (name: string) => screen.getByRole('columnheader', { name });
const sortButton = (name: string) => within(header(name)).getByRole('button', { name });

describeTask('DataTable', () => {
  it('renders the caption, headers, first page and summary', () => {
    renderTable();
    expect(screen.getByRole('table', { name: 'Team' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent?.replace(/[^A-Za-z]/g, ''))).toEqual([
      'Name',
      'Email',
      'Role',
      'Age',
    ]);
    expect(names()).toEqual(['Zara Khan', 'aaron Lee', 'Maya Patel', 'Ben Ode', 'Chloe Kim']);
    expect(screen.getByText('34 yrs')).toBeInTheDocument();
    expect(screen.getByText('Showing 1–5 of 12')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('pages forward and back, disabling buttons at the ends', async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(names()).toEqual(['Dev Rao', 'Eli Park', 'Fay Wong', 'Gus Hale', 'Hana Sato']);
    expect(screen.getByText('Showing 6–10 of 12')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(names()).toEqual(['Ivan Petrov', 'Jo March']);
    expect(screen.getByText('Showing 11–12 of 12')).toBeInTheDocument();
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByText('Page 2 of 3')).toBeInTheDocument();
  });

  it('cycles a column through ascending, descending and unsorted with aria-sort', async () => {
    const user = userEvent.setup();
    renderTable();
    expect(['none', null]).toContain(header('Name').getAttribute('aria-sort'));

    await user.click(sortButton('Name'));
    expect(header('Name')).toHaveAttribute('aria-sort', 'ascending');
    expect(names()).toEqual(['aaron Lee', 'Ben Ode', 'Chloe Kim', 'Dev Rao', 'Eli Park']);

    await user.click(sortButton('Name'));
    expect(header('Name')).toHaveAttribute('aria-sort', 'descending');
    expect(names()).toEqual(['Zara Khan', 'Maya Patel', 'Jo March', 'Ivan Petrov', 'Hana Sato']);

    await user.click(sortButton('Name'));
    expect(['none', null]).toContain(header('Name').getAttribute('aria-sort'));
    expect(names()).toEqual(['Zara Khan', 'aaron Lee', 'Maya Patel', 'Ben Ode', 'Chloe Kim']);
  });

  it('sorts numbers numerically across the whole dataset, not just the current page', async () => {
    const user = userEvent.setup();
    renderTable();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.click(sortButton('Age'));
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(names().slice(0, 3)).toEqual(['aaron Lee', 'Dev Rao', 'Gus Hale']);
    await user.click(sortButton('Age'));
    expect(names()[0]).toBe('Maya Patel');
  });

  it('only renders sort buttons for sortable columns, and switching columns starts ascending', async () => {
    const user = userEvent.setup();
    renderTable();
    expect(within(header('Email')).queryByRole('button')).not.toBeInTheDocument();

    await user.click(sortButton('Name'));
    await user.click(sortButton('Name'));
    await user.click(sortButton('Role'));
    expect(header('Role')).toHaveAttribute('aria-sort', 'ascending');
    expect(['none', null]).toContain(header('Name').getAttribute('aria-sort'));
    expect(names()).toEqual(['aaron Lee', 'Chloe Kim', 'Jo March', 'Zara Khan', 'Ben Ode']);
  });

  it('searches raw values across columns, case-insensitively', async () => {
    const user = userEvent.setup();
    renderTable();
    await user.type(screen.getByLabelText('Search'), 'KITE.DEV');
    expect(names()).toEqual(['Maya Patel', 'Chloe Kim', 'Fay Wong', 'Ivan Petrov']);
    expect(screen.getByText('Showing 1–4 of 4')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });

  it('does not search rendered text, and shows the empty state', async () => {
    const user = userEvent.setup();
    renderTable();
    await user.type(screen.getByLabelText('Search'), 'yrs');
    expect(screen.getByText('No results')).toBeInTheDocument();
    expect(screen.getByText('Showing 0 of 0')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  });

  it('filters with a select of distinct values and combines with search', async () => {
    const user = userEvent.setup();
    renderTable();
    const select = screen.getByLabelText('Role filter');
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All',
      'Designer',
      'Engineer',
      'Manager',
      'Product',
      'Support',
    ]);
    await user.selectOptions(select, 'Engineer');
    expect(names()).toEqual(['Zara Khan', 'Ben Ode', 'Eli Park', 'Hana Sato']);
    await user.type(screen.getByLabelText('Search'), 'ha');
    expect(names()).toEqual(['Zara Khan', 'Hana Sato']);
    await user.selectOptions(select, 'All');
    expect(names()).toEqual(['Zara Khan', 'Gus Hale', 'Hana Sato']);
  });

  it('changes the page size', async () => {
    const user = userEvent.setup();
    renderTable();
    await user.selectOptions(screen.getByLabelText('Rows per page'), '10');
    expect(names()).toHaveLength(10);
    expect(screen.getByText('Showing 1–10 of 12')).toBeInTheDocument();
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('returns to page 1 when search, filter or page size changes', async () => {
    const user = userEvent.setup();
    renderTable();
    const next = () => screen.getByRole('button', { name: 'Next page' });

    await user.click(next());
    await user.type(screen.getByLabelText('Search'), 'e');
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();

    await user.click(next());
    await user.selectOptions(screen.getByLabelText('Rows per page'), '10');
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    await user.click(next());
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Role filter'), 'Designer');
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });

  it('falls back to the last existing page when rows shrink', async () => {
    const user = userEvent.setup();
    const { rerender } = renderTable();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();

    rerender(
      <DataTable
        caption="Team"
        columns={columns}
        rows={people.slice(0, 7)}
        filter={{ key: 'role', label: 'Role filter' }}
        pageSizeOptions={[5, 10]}
      />,
    );
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    expect(screen.getByText('Showing 6–7 of 7')).toBeInTheDocument();
    expect(names()).toEqual(['Dev Rao', 'Eli Park']);
  });
});
