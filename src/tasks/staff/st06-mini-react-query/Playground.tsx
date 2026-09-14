import { Component, useMemo, useState, type ReactNode } from 'react';
import { getTodos, getUsers, saveTodo, type Todo } from '../../../mocks/api';
import type { MiniReactQueryModule, QueryClientApi } from './types';

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <p style={{ color: '#b91c1c' }}>Error: {this.state.error.message}</p>;
    return this.props.children;
  }
}

type ImplProps = { impl: MiniReactQueryModule };

function UsersPage({ impl }: ImplProps) {
  const [page, setPage] = useState(1);
  const { data, status, isFetching, error, refetch } = impl.useQuery({
    queryKey: ['users', { page, pageSize: 5 }],
    queryFn: ({ signal }) => getUsers({ page, pageSize: 5 }, { signal, failRate: 0.2 }),
    staleTime: 10_000,
    retry: 2,
  });
  return (
    <section>
      <h3>
        Users, page {page} {isFetching && <small role="status">(fetching…)</small>}
      </h3>
      {status === 'pending' && <p role="status">Loading…</p>}
      {status === 'error' && <p role="alert">Failed: {String((error as Error)?.message ?? error)}</p>}
      <ul>
        {data?.rows.map((u) => (
          <li key={u.id}>
            {u.name} · {u.role}
          </li>
        ))}
      </ul>
      <button type="button" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
        Previous
      </button>{' '}
      <button type="button" onClick={() => setPage((p) => p + 1)}>
        Next
      </button>{' '}
      <button type="button" onClick={() => void refetch()}>
        Refetch
      </button>
      <p style={{ fontSize: 13, color: '#667085' }}>
        Go to page 2 and back: page 1 should render instantly from cache (fresh for 10s). 20% of requests fail and retry.
      </p>
    </section>
  );
}

function TodosPanel({ impl }: ImplProps) {
  const client = impl.useQueryClient();
  const [title, setTitle] = useState('');
  const todos = impl.useQuery({ queryKey: ['todos'], queryFn: ({ signal }) => getTodos({ signal }) });
  const add = impl.useMutation({
    mutationFn: (t: string) => saveTodo({ id: crypto.randomUUID(), title: t, done: false, updatedAt: Date.now() }),
    onSuccess: () => client.invalidateQueries(['todos']),
  });
  return (
    <section>
      <h3>Todos {todos.isFetching && <small role="status">(fetching…)</small>}</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!title.trim()) return;
          add.mutate(title.trim());
          setTitle('');
        }}
      >
        <input aria-label="New todo" value={title} onChange={(e) => setTitle(e.target.value)} />{' '}
        <button type="submit" aria-busy={add.status === 'pending'} disabled={add.status === 'pending'}>
          {add.status === 'pending' ? 'Saving…' : 'Add'}
        </button>
      </form>
      <ul>
        {(todos.data ?? []).map((t: Todo) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </section>
  );
}

export default function Playground({ impl }: ImplProps) {
  const [showUsers, setShowUsers] = useState(true);
  const { client, error } = useMemo((): { client: QueryClientApi | null; error: string | null } => {
    try {
      return { client: new impl.QueryClient({ defaultOptions: { queries: { gcTime: 30_000 } } }), error: null };
    } catch (e) {
      return { client: null, error: (e as Error).message };
    }
  }, [impl]);

  if (!client) return <p style={{ color: '#b91c1c' }}>Error: {error}</p>;
  const { QueryClientProvider } = impl;

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 16, maxWidth: 560 }}>
      <Boundary>
        <QueryClientProvider client={client}>
          <label>
            <input type="checkbox" checked={showUsers} onChange={(e) => setShowUsers(e.target.checked)} /> Mount users
            panel (unmount it, then remount within 30s to see the cache survive)
          </label>
          {showUsers && <UsersPage impl={impl} />}
          <TodosPanel impl={impl} />
        </QueryClientProvider>
      </Boundary>
    </div>
  );
}
