// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { DirectoryApi, Member, MemberProfile } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const TeamDirectory = impl.default;

const PROFILES: MemberProfile[] = [
  { id: 'a', name: 'Ada Lovelace', title: 'Staff Engineer', email: 'ada@example.com', location: 'London' },
  { id: 'g', name: 'Grace Hopper', title: 'Manager', email: 'grace@example.com', location: 'New York' },
  { id: 't', name: 'Alan Turing', title: 'Engineer', email: 'alan@example.com', location: 'Manchester' },
  { id: 'k', name: 'Katherine Johnson', title: 'Data Scientist', email: 'katherine@example.com', location: 'Hampton' },
];
const MEMBERS: Member[] = PROFILES.map(({ id, name, title }) => ({ id, name, title }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeApi(overrides: Partial<DirectoryApi> = {}): DirectoryApi {
  return {
    listMembers: vi.fn(() => Promise.resolve(MEMBERS.map((m) => ({ ...m })))),
    getMember: vi.fn((id: string) => Promise.resolve({ ...PROFILES.find((p) => p.id === id)! })),
    ...overrides,
  };
}

async function setup(api: DirectoryApi = makeApi()) {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const utils = render(<TeamDirectory api={api} />);
  await screen.findByRole('button', { name: 'Ada Lovelace' });
  return { user, api, ...utils };
}

const search = () => screen.getByLabelText('Search people');
const profile = () => screen.queryByRole('region', { name: 'Profile' });

async function typeSearch(user: ReturnType<typeof userEvent.setup>, text: string) {
  await user.type(search(), text);
  act(() => {
    vi.advanceTimersByTime(350);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describeTask('TeamDirectory bug tickets', () => {
  it('BUG-1: the "Online for Ns" counter keeps counting', async () => {
    await setup();
    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(screen.getByText(/Online for 3s/)).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText(/Online for 5s/)).toBeInTheDocument();
  });

  it('BUG-2: selecting a different person shows that person’s profile', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));
    expect(await within(profile()!).findByText('ada@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Grace Hopper' }));
    expect(await within(profile()!).findByText('grace@example.com')).toBeInTheDocument();
    expect(within(profile()!).queryByText('ada@example.com')).not.toBeInTheDocument();
  });

  it('BUG-3: a slow response for an earlier selection never replaces the current profile', async () => {
    const pending = new Map<string, ReturnType<typeof deferred<MemberProfile>>>();
    const api = makeApi({
      getMember: vi.fn((id: string) => {
        const d = deferred<MemberProfile>();
        pending.set(id, d);
        return d.promise;
      }),
    });
    const { user } = await setup(api);

    await user.click(screen.getByRole('button', { name: 'Ada Lovelace' }));
    await user.click(screen.getByRole('button', { name: 'Grace Hopper' }));

    await act(async () => {
      pending.get('g')?.resolve({ ...PROFILES[1] });
    });
    expect(await within(profile()!).findByText('grace@example.com')).toBeInTheDocument();

    // Ada's request was sent first but finishes last.
    await act(async () => {
      pending.get('a')?.resolve({ ...PROFILES[0] });
    });
    expect(within(profile()!).getByText('grace@example.com')).toBeInTheDocument();
    expect(within(profile()!).queryByText('ada@example.com')).not.toBeInTheDocument();
  });

  it('BUG-4: a favourite stays with the same person after searching', async () => {
    const { user } = await setup();
    await user.click(screen.getByRole('checkbox', { name: 'Favourite Grace Hopper' }));
    expect(screen.getByRole('checkbox', { name: 'Favourite Grace Hopper' })).toBeChecked();

    await typeSearch(user, 'gr');
    expect(screen.queryByRole('button', { name: 'Ada Lovelace' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Favourite Grace Hopper' })).toBeChecked();

    await user.clear(search());
    await typeSearch(user, 'a');
    expect(screen.getByRole('checkbox', { name: 'Favourite Ada Lovelace' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Favourite Alan Turing' })).not.toBeChecked();
  });

  it('BUG-5: an added guest appears in the list straight away', async () => {
    const { user } = await setup();
    await user.type(screen.getByLabelText('Guest name'), 'Mary Jackson');
    await user.click(screen.getByRole('button', { name: 'Add guest' }));
    expect(screen.getByRole('button', { name: 'Mary Jackson' })).toBeInTheDocument();
    expect(screen.getByLabelText('Guest name')).toHaveValue('');
  });

  it('BUG-6: the "Showing N of M" count matches the filtered list', async () => {
    const { user } = await setup();
    expect(screen.getByText('Showing 4 of 4')).toBeInTheDocument();
    await typeSearch(user, 'gr');
    expect(screen.getByText('Showing 1 of 4')).toBeInTheDocument();
    await user.clear(search());
    await typeSearch(user, 'zzz');
    expect(screen.getByText('Showing 0 of 4')).toBeInTheDocument();
  });

  it('BUG-7: the Escape shortcut works and its listener is removed on unmount', async () => {
    const targets = [window, document] as const;
    type Registration = { target: EventTarget; listener: unknown; signal?: AbortSignal };
    const added: Registration[] = [];
    const removed: Registration[] = [];
    for (const target of targets) {
      const originalAdd = target.addEventListener.bind(target);
      const originalRemove = target.removeEventListener.bind(target);
      vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
        if (type === 'keydown') {
          const signal = typeof options === 'object' ? options?.signal : undefined;
          added.push({ target, listener, signal });
        }
        originalAdd(type, listener, options);
      });
      vi.spyOn(target, 'removeEventListener').mockImplementation((type, listener, options) => {
        if (type === 'keydown') removed.push({ target, listener });
        originalRemove(type, listener, options);
      });
    }

    const { unmount } = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Ada Lovelace' }));
    expect(await screen.findByRole('region', { name: 'Profile' })).toBeInTheDocument();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(profile()).not.toBeInTheDocument();

    unmount();
    const leaked = added.filter(
      (a) => !a.signal?.aborted && !removed.some((r) => r.target === a.target && r.listener === a.listener),
    );
    expect(leaked).toHaveLength(0);
  });
});

describeFollowUp(1, 'sort option', () => {
  const rowNames = () =>
    screen.getAllByRole('checkbox', { name: /^Favourite / }).map((c) => c.getAttribute('aria-label')?.replace('Favourite ', ''));

  it('sorts by name both ways and returns to the API order', async () => {
    const { user } = await setup();
    const sort = screen.getByRole('combobox', { name: 'Sort by' });
    await user.selectOptions(sort, 'Name (A–Z)');
    expect(rowNames()).toEqual(['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Katherine Johnson']);
    await user.selectOptions(sort, 'Name (Z–A)');
    expect(rowNames()).toEqual(['Katherine Johnson', 'Grace Hopper', 'Alan Turing', 'Ada Lovelace']);
    await user.selectOptions(sort, 'Default order');
    expect(rowNames()).toEqual(MEMBERS.map((m) => m.name));
  });
});

describeFollowUp(2, 'optimistic favourite with rollback', () => {
  it('checks immediately, persists via the api, and rolls back with an alert when the save fails', async () => {
    const saves: ReturnType<typeof deferred<void>>[] = [];
    const setFavourite = vi.fn(() => {
      const d = deferred<void>();
      saves.push(d);
      return d.promise;
    });
    const { user } = await setup(makeApi({ setFavourite }));

    await user.click(screen.getByRole('checkbox', { name: 'Favourite Grace Hopper' }));
    expect(screen.getByRole('checkbox', { name: 'Favourite Grace Hopper' })).toBeChecked();
    expect(setFavourite).toHaveBeenLastCalledWith('g', true);
    await act(async () => saves[0].resolve());
    expect(screen.getByRole('checkbox', { name: 'Favourite Grace Hopper' })).toBeChecked();

    await user.click(screen.getByRole('checkbox', { name: 'Favourite Ada Lovelace' }));
    expect(screen.getByRole('checkbox', { name: 'Favourite Ada Lovelace' })).toBeChecked();
    expect(setFavourite).toHaveBeenLastCalledWith('a', true);
    await act(async () => saves[1].reject(new Error('nope')));
    expect(screen.getByRole('checkbox', { name: 'Favourite Ada Lovelace' })).not.toBeChecked();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save favourite');
    expect(screen.getByRole('checkbox', { name: 'Favourite Grace Hopper' })).toBeChecked();
  });
});
