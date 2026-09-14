// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { MiniRouterModule, NavigateFunction } from './types';

vi.mock('react-router', () => {
  throw new Error('S59: do not import react-router. Build the router yourself.');
});

const { impl: rawImpl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const { Router, Routes, Route, Link, useParams, useNavigate, useSearchParams } = rawImpl as unknown as MiniRouterModule;

beforeEach(() => {
  window.history.pushState(null, '', '/');
});
afterEach(() => {
  vi.restoreAllMocks();
});

const navigateRefs: NavigateFunction[] = [];

function Home() {
  const navigate = useNavigate();
  navigateRefs.push(navigate);
  return (
    <>
      <h1>Home</h1>
      <button type="button" onClick={() => navigate('/users/7')}>
        Open user 7
      </button>
      <button type="button" onClick={() => navigate('/about', { replace: true })}>
        Replace with about
      </button>
    </>
  );
}

function UserPage() {
  const { id } = useParams();
  return <h1>User {id}</h1>;
}

function PostPage() {
  const params = useParams();
  return <h1>{`Post ${params.postId} by ${params.id}`}</h1>;
}

function About() {
  const params = useParams();
  return <h1>About {JSON.stringify(params)}</h1>;
}

function App({ extraLinks }: { extraLinks?: ReactNode }) {
  return (
    <Router>
      <nav>
        <Link to="/">Home link</Link>
        <Link to="/about" className="nav-link" aria-describedby="hint">
          About link
        </Link>
        <Link to="/users/42">User 42</Link>
        {extraLinks}
      </nav>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<h1>Not found</h1>} />
        <Route path="/about" element={<About />} />
        <Route path="/users/:id" element={<UserPage />} />
        <Route path="/users/:id/posts/:postId" element={<PostPage />} />
      </Routes>
    </Router>
  );
}

const heading = (name: string | RegExp) => screen.getByRole('heading', { name });
const link = (name: string) => screen.getByRole('link', { name });

function popTo(path: string) {
  act(() => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

/** Records whether the click reached window with defaultPrevented set, and stops jsdom from "navigating". */
function watchClicks() {
  const seen: boolean[] = [];
  const listener = (event: Event) => {
    seen.push(event.defaultPrevented);
    event.preventDefault();
  };
  window.addEventListener('click', listener);
  return { seen, stop: () => window.removeEventListener('click', listener) };
}

describeTask('Mini router', () => {
  it('renders the route for the initial URL, ignoring one trailing slash and the query string', () => {
    window.history.replaceState(null, '', '/about/?tab=1#top');
    render(<App />);
    expect(heading('About {}')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Not found' })).not.toBeInTheDocument();
  });

  it('Link renders a real anchor and navigates with pushState on a plain click', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(heading('Home')).toBeInTheDocument();
    const about = link('About link');
    expect(about).toHaveAttribute('href', '/about');
    expect(about).toHaveClass('nav-link');
    expect(about).toHaveAttribute('aria-describedby', 'hint');

    const clicks = watchClicks();
    const before = window.history.length;
    await user.click(about);
    clicks.stop();
    expect(clicks.seen).toEqual([true]);
    expect(window.location.pathname).toBe('/about');
    expect(window.history.length).toBe(before + 1);
    expect(heading('About {}')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Home' })).not.toBeInTheDocument();
  });

  it('matches dynamic segments and exposes decoded params', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(link('User 42'));
    expect(heading('User 42')).toBeInTheDocument();
    popTo('/users/ada%20l/posts/7');
    expect(heading('Post 7 by ada l')).toBeInTheDocument();
  });

  it('renders the * fallback only when nothing else matches', () => {
    render(<App />);
    popTo('/nope');
    expect(heading('Not found')).toBeInTheDocument();
    popTo('/users/');
    expect(heading('Not found')).toBeInTheDocument();
    popTo('/users/42/extra');
    expect(heading('Not found')).toBeInTheDocument();
    popTo('/About');
    expect(heading('Not found')).toBeInTheDocument();
    popTo('/users/9');
    expect(heading('User 9')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Not found' })).not.toBeInTheDocument();
  });

  it('useNavigate pushes or replaces, and keeps a stable identity', async () => {
    const user = userEvent.setup();
    navigateRefs.length = 0;
    render(<App />);
    const before = window.history.length;
    await user.click(screen.getByRole('button', { name: 'Open user 7' }));
    expect(window.location.pathname).toBe('/users/7');
    expect(window.history.length).toBe(before + 1);
    expect(heading('User 7')).toBeInTheDocument();

    await user.click(link('Home link'));
    const lengthAtHome = window.history.length;
    await user.click(screen.getByRole('button', { name: 'Replace with about' }));
    expect(window.location.pathname).toBe('/about');
    expect(window.history.length).toBe(lengthAtHome);
    expect(heading('About {}')).toBeInTheDocument();

    popTo('/');
    expect(navigateRefs.length).toBeGreaterThan(1);
    expect(new Set(navigateRefs).size).toBe(1);
  });

  it('does not intercept modifier clicks, non-left clicks or target="_blank"', () => {
    render(
      <App
        extraLinks={
          <Link to="/users/1" target="_blank">
            New tab link
          </Link>
        }
      />,
    );
    const clicks = watchClicks();
    fireEvent.click(link('About link'), { metaKey: true });
    fireEvent.click(link('About link'), { ctrlKey: true });
    fireEvent.click(link('About link'), { shiftKey: true });
    fireEvent.click(link('About link'), { button: 1 });
    fireEvent.click(link('New tab link'));
    clicks.stop();
    expect(clicks.seen).toEqual([false, false, false, false, false]);
    expect(window.location.pathname).toBe('/');
    expect(heading('Home')).toBeInTheDocument();
  });

  it('calls the Link onClick first and respects its preventDefault; replace uses replaceState', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    const onReplaceClick = vi.fn();
    render(
      <App
        extraLinks={
          <>
            <Link to="/users/5" onClick={onClick}>
              Guarded link
            </Link>
            <Link to="/users/6" replace onClick={onReplaceClick}>
              Replace link
            </Link>
          </>
        }
      />,
    );
    await user.click(link('Guarded link'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/');

    const before = window.history.length;
    await user.click(link('Replace link'));
    expect(onReplaceClick).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/users/6');
    expect(window.history.length).toBe(before);
    expect(heading('User 6')).toBeInTheDocument();
  });

  it('re-renders on popstate, including the real history.back()', async () => {
    const user = userEvent.setup();
    render(<App />);
    popTo('/users/3');
    expect(heading('User 3')).toBeInTheDocument();

    await user.click(link('About link'));
    expect(heading('About {}')).toBeInTheDocument();
    act(() => window.history.back());
    expect(await screen.findByRole('heading', { name: 'User 3' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/users/3');
  });

  it('removes its popstate listener on unmount', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<App />);
    const added = add.mock.calls.filter(([type]) => type === 'popstate').map(([, fn]) => fn);
    expect(added.length).toBeGreaterThan(0);
    unmount();
    const removed = remove.mock.calls.filter(([type]) => type === 'popstate').map(([, fn]) => fn);
    for (const fn of added) expect(removed).toContain(fn);
  });

  it('throws a clear error when hooks are used outside <Router>', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useNavigate())).toThrow();
    expect(() => renderHook(() => useParams())).toThrow();
  });
});

describeFollowUp(2, 'route ranking', () => {
  it('prefers static segments over dynamic ones regardless of order', () => {
    render(
      <Router>
        <Routes>
          <Route path="*" element={<h1>Not found</h1>} />
          <Route path="/users/:id" element={<UserPage />} />
          <Route path="/users/new" element={<h1>New user</h1>} />
        </Routes>
      </Router>,
    );
    popTo('/users/new');
    expect(heading('New user')).toBeInTheDocument();
    popTo('/users/5');
    expect(heading('User 5')).toBeInTheDocument();
  });
});

describeFollowUp(3, 'useSearchParams', () => {
  function Search() {
    const [params, setParams] = useSearchParams();
    const [count, setCount] = useState(0);
    return (
      <>
        <h1>Query: {params.get('q') ?? '(none)'}</h1>
        <button
          type="button"
          onClick={() => {
            setCount(count + 1);
            setParams({ q: `react ${count}` });
          }}
        >
          Search
        </button>
        <button type="button" onClick={() => setParams(new URLSearchParams({ q: 'replaced' }), { replace: true })}>
          Replace search
        </button>
      </>
    );
  }

  it('reads and writes the query string without changing the pathname', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/search?q=hooks');
    render(
      <Router>
        <Routes>
          <Route path="/search" element={<Search />} />
        </Routes>
      </Router>,
    );
    expect(heading('Query: hooks')).toBeInTheDocument();
    const before = window.history.length;
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(heading('Query: react 0')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/search');
    expect(new URLSearchParams(window.location.search).get('q')).toBe('react 0');
    expect(window.history.length).toBe(before + 1);

    await user.click(screen.getByRole('button', { name: 'Replace search' }));
    expect(heading('Query: replaced')).toBeInTheDocument();
    expect(window.history.length).toBe(before + 1);
  });
});
