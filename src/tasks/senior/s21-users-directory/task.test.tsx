// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi, type Mock } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { User, UserDraft, UsersApi } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const UsersDirectory = impl.default;

const USERS: User[] = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', role: 'Engineer', department: 'Platform', age: 36, active: true, joinedAt: '2020-01-15' },
  { id: 2, name: 'Grace Hopper', email: 'grace@example.com', role: 'Manager', department: 'Search', age: 45, active: true, joinedAt: '2018-06-01' },
  { id: 3, name: 'Alan Turing', email: 'alan@example.com', role: 'Engineer', department: 'Payments', age: 41, active: false, joinedAt: '2019-03-20' },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type ApiMocks = { [K in keyof UsersApi]: Mock<UsersApi[K]> };

function makeApi(overrides: Partial<ApiMocks> = {}): ApiMocks {
  return {
    getAllUsers: vi.fn<UsersApi['getAllUsers']>(() => Promise.resolve(structuredClone(USERS))),
    saveUser: vi.fn<UsersApi['saveUser']>((draft: UserDraft) =>
      Promise.resolve({ ...draft, id: draft.id ?? 99 } as User),
    ),
    deleteUser: vi.fn<UsersApi['deleteUser']>(() => Promise.resolve({ ok: true as const })),
    ...overrides,
  };
}

async function setup(api = makeApi()) {
  const user = userEvent.setup();
  render(<UsersDirectory api={api} />);
  await screen.findByRole('button', { name: 'Edit Ada Lovelace' });
  return { user, api };
}

function expectRowOrder(names: string[]) {
  const buttons = screen.queryAllByRole('button', { name: /^Edit / });
  expect(buttons).toHaveLength(names.length);
  names.forEach((name, i) => expect(buttons[i]).toHaveAccessibleName(`Edit ${name}`));
}
const visibleNames = () => screen.queryAllByRole('button', { name: /^Edit / }).length;
const hasRow = (name: string) => screen.queryByRole('button', { name: `Edit ${name}` }) !== null;

describeTask('UsersDirectory', () => {
  it('shows a loading state, then one row per user', async () => {
    const d = deferred<User[]>();
    const api = makeApi({ getAllUsers: vi.fn<UsersApi['getAllUsers']>(() => d.promise) });
    render(<UsersDirectory api={api} />);
    expect(screen.getByText(/loading users/i)).toBeInTheDocument();
    expect(api.getAllUsers).toHaveBeenCalledTimes(1);
    await act(async () => d.resolve(structuredClone(USERS)));
    expect(screen.queryByText(/loading users/i)).not.toBeInTheDocument();
    expect(hasRow('Ada Lovelace')).toBe(true);
    expect(hasRow('Grace Hopper')).toBe(true);
    expect(hasRow('Alan Turing')).toBe(true);
    expect(screen.getByRole('table')).toHaveTextContent('grace@example.com');
    expect(screen.getByRole('table')).toHaveTextContent('Inactive');
  });

  it('shows an error with Retry when loading fails', async () => {
    const user = userEvent.setup();
    const getAllUsers = vi
      .fn<UsersApi['getAllUsers']>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(structuredClone(USERS));
    render(<UsersDirectory api={makeApi({ getAllUsers })} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load users');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: 'Edit Ada Lovelace' })).toBeInTheDocument();
    expect(getAllUsers).toHaveBeenCalledTimes(2);
  });

  it('shows "No users yet" when the API returns no users', async () => {
    render(<UsersDirectory api={makeApi({ getAllUsers: vi.fn<UsersApi['getAllUsers']>(() => Promise.resolve([])) })} />);
    expect(await screen.findByText('No users yet')).toBeInTheDocument();
  });

  it('searches by name or email, case-insensitively', async () => {
    const { user } = await setup();
    const search = screen.getByLabelText('Search users');
    await user.type(search, 'GRACE');
    expect(visibleNames()).toBe(1);
    expect(hasRow('Grace Hopper')).toBe(true);
    await user.clear(search);
    await user.type(search, 'alan@');
    expect(visibleNames()).toBe(1);
    expect(hasRow('Alan Turing')).toBe(true);
    await user.clear(search);
    await user.type(search, 'zzz');
    expect(visibleNames()).toBe(0);
    expect(screen.getByText('No users match your filters')).toBeInTheDocument();
  });

  it('filters by role and combines with search', async () => {
    const { user } = await setup();
    await user.selectOptions(screen.getByLabelText('Filter by role'), 'Engineer');
    expect(visibleNames()).toBe(2);
    expect(hasRow('Grace Hopper')).toBe(false);
    await user.type(screen.getByLabelText('Search users'), 'ada');
    expect(visibleNames()).toBe(1);
    expect(hasRow('Ada Lovelace')).toBe(true);
    await user.selectOptions(screen.getByLabelText('Filter by role'), '');
    await user.clear(screen.getByLabelText('Search users'));
    expect(visibleNames()).toBe(3);
  });

  it('validates required fields on Save without calling the API', async () => {
    const { user, api } = await setup();
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    const dialog = screen.getByRole('dialog', { name: 'Add user' });
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByText('Name is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Email is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Age must be between 18 and 100')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(within(dialog).getByLabelText('Name')).toHaveFocus();
    expect(api.saveUser).not.toHaveBeenCalled();
  });

  it('rejects invalid and duplicate emails and out-of-range ages', async () => {
    const { user, api } = await setup();
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    const dialog = screen.getByRole('dialog', { name: 'Add user' });
    await user.type(within(dialog).getByLabelText('Name'), 'Linus Lee');
    await user.type(within(dialog).getByLabelText('Email'), 'not-an-email');
    await user.type(within(dialog).getByLabelText('Age'), '12');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByText('Enter a valid email')).toBeInTheDocument();
    expect(within(dialog).getByText('Age must be between 18 and 100')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Email')).toHaveFocus();

    await user.clear(within(dialog).getByLabelText('Email'));
    await user.type(within(dialog).getByLabelText('Email'), ' Grace@Example.com ');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByText('Email is already in use')).toBeInTheDocument();
    expect(api.saveUser).not.toHaveBeenCalled();
  });

  it('adds a valid user, closes the dialog and appends the returned user', async () => {
    const { user, api } = await setup();
    await user.click(screen.getByRole('button', { name: 'Add user' }));
    const dialog = screen.getByRole('dialog', { name: 'Add user' });
    expect(within(dialog).getByLabelText('Role')).toHaveValue('Engineer');
    expect(within(dialog).getByLabelText('Active')).toBeChecked();
    await user.type(within(dialog).getByLabelText('Name'), '  Linus Lee ');
    await user.type(within(dialog).getByLabelText('Email'), 'linus@example.com');
    await user.selectOptions(within(dialog).getByLabelText('Role'), 'Designer');
    await user.type(within(dialog).getByLabelText('Age'), '29');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(api.saveUser).toHaveBeenCalledTimes(1);
    const draft = api.saveUser.mock.calls[0][0];
    expect(draft).toEqual(
      expect.objectContaining({
        name: 'Linus Lee',
        email: 'linus@example.com',
        role: 'Designer',
        department: 'Platform',
        age: 29,
        active: true,
        joinedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      }),
    );
    expect(draft.id).toBeUndefined();
    expect(await screen.findByRole('button', { name: 'Edit Linus Lee' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expectRowOrder(['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Linus Lee']);
  });

  it('edits a user in place with a prefilled form', async () => {
    const { user, api } = await setup();
    await user.click(screen.getByRole('button', { name: 'Edit Grace Hopper' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit user' });
    const name = within(dialog).getByLabelText('Name');
    expect(name).toHaveValue('Grace Hopper');
    expect(within(dialog).getByLabelText('Email')).toHaveValue('grace@example.com');
    expect(within(dialog).getByLabelText('Role')).toHaveValue('Manager');
    await user.clear(name);
    await user.type(name, 'Grace B. Hopper');
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(api.saveUser).toHaveBeenCalledTimes(1);
    expect(api.saveUser.mock.calls[0][0]).toEqual(
      expect.objectContaining({ id: 2, name: 'Grace B. Hopper', email: 'grace@example.com', age: 45, joinedAt: '2018-06-01' }),
    );
    expect(await screen.findByRole('button', { name: 'Edit Grace B. Hopper' })).toBeInTheDocument();
    expectRowOrder(['Ada Lovelace', 'Grace B. Hopper', 'Alan Turing']);
  });

  it('keeps the dialog open with an alert when saving fails', async () => {
    const d = deferred<User>();
    const { user, api } = await setup(makeApi({ saveUser: vi.fn<UsersApi['saveUser']>(() => d.promise) }));
    await user.click(screen.getByRole('button', { name: 'Edit Ada Lovelace' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit user' });
    await user.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByRole('button', { name: /sav/i })).toBeDisabled();
    await act(async () => d.reject(new Error('500')));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(/could not save user/i);
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Ada Lovelace');
    expect(api.saveUser).toHaveBeenCalledTimes(1);
  });

  it('closes the dialog on Escape and returns focus to the trigger', async () => {
    const { user, api } = await setup();
    const trigger = screen.getByRole('button', { name: 'Add user' });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Add user' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(api.saveUser).not.toHaveBeenCalled();
  });

  it('asks for confirmation before deleting; Cancel keeps the user', async () => {
    const { user, api } = await setup();
    await user.click(screen.getByRole('button', { name: 'Delete Alan Turing' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Delete Alan Turing?' });
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(hasRow('Alan Turing')).toBe(true);
    expect(api.deleteUser).not.toHaveBeenCalled();
  });

  it('removes the row optimistically before the server responds', async () => {
    const d = deferred<{ ok: true }>();
    const { user, api } = await setup(makeApi({ deleteUser: vi.fn<UsersApi['deleteUser']>(() => d.promise) }));
    await user.click(screen.getByRole('button', { name: 'Delete Grace Hopper' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    expect(api.deleteUser).toHaveBeenCalledTimes(1);
    expect(api.deleteUser.mock.calls[0][0]).toBe(2);
    expect(hasRow('Grace Hopper')).toBe(false);
    await act(async () => d.resolve({ ok: true }));
    expect(hasRow('Grace Hopper')).toBe(false);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rolls back a failed delete to its original position and shows an error', async () => {
    const d = deferred<{ ok: true }>();
    const { user } = await setup(makeApi({ deleteUser: vi.fn<UsersApi['deleteUser']>(() => d.promise) }));
    await user.click(screen.getByRole('button', { name: 'Delete Grace Hopper' }));
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    expect(hasRow('Grace Hopper')).toBe(false);
    await act(async () => d.reject(new Error('500')));
    expectRowOrder(['Ada Lovelace', 'Grace Hopper', 'Alan Turing']);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Could not delete Grace Hopper');
    await user.click(within(alert).getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
