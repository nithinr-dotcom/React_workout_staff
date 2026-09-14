// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';

const { impl, describeTask } = pickTarget(Solution, Reference);
const LikeButton = impl.default;

/** A promise the test settles by hand. */
function deferred() {
  let resolve!: (value?: unknown) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const likeButton = () => screen.getByRole('button', { name: /like/i });

describeTask('LikeButton', () => {
  it('renders the initial state and count', () => {
    render(<LikeButton initialLiked={false} initialCount={3} onToggle={vi.fn()} />);
    expect(likeButton()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('3 likes')).toBeInTheDocument();
  });

  it('uses singular "like" for exactly one and plural otherwise', () => {
    const { unmount } = render(<LikeButton initialLiked initialCount={1} onToggle={vi.fn()} />);
    expect(screen.getByText('1 like')).toBeInTheDocument();
    expect(likeButton()).toHaveAttribute('aria-pressed', 'true');
    unmount();
    render(<LikeButton onToggle={vi.fn()} />);
    expect(screen.getByText('0 likes')).toBeInTheDocument();
  });

  it('calls onToggle once with the next state', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn(() => Promise.resolve());
    render(<LikeButton initialCount={3} onToggle={onToggle} />);
    await user.click(likeButton());
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('updates optimistically and disables the button while pending', async () => {
    const user = userEvent.setup();
    const request = deferred();
    render(<LikeButton initialCount={3} onToggle={() => request.promise} />);
    await user.click(likeButton());
    expect(likeButton()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('4 likes')).toBeInTheDocument();
    expect(likeButton()).toBeDisabled();

    request.resolve();
    await waitFor(() => expect(likeButton()).toBeEnabled());
    expect(likeButton()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('4 likes')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rolls back and shows an error when the request fails', async () => {
    const user = userEvent.setup();
    const request = deferred();
    render(<LikeButton initialCount={3} onToggle={() => request.promise} />);
    await user.click(likeButton());
    expect(screen.getByText('4 likes')).toBeInTheDocument();

    request.reject(new Error('boom'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(likeButton()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('3 likes')).toBeInTheDocument();
    expect(likeButton()).toBeEnabled();
  });

  it('unliking decrements optimistically and rolls back on failure', async () => {
    const user = userEvent.setup();
    const request = deferred();
    const onToggle = vi.fn(() => request.promise);
    render(<LikeButton initialLiked initialCount={10} onToggle={onToggle} />);
    await user.click(likeButton());
    expect(onToggle).toHaveBeenCalledWith(false);
    expect(likeButton()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('9 likes')).toBeInTheDocument();

    request.reject(new Error('boom'));
    await screen.findByRole('alert');
    expect(likeButton()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('10 likes')).toBeInTheDocument();
  });

  it('clears the error on the next click', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);
    render(<LikeButton initialCount={0} onToggle={onToggle} />);
    await user.click(likeButton());
    await screen.findByRole('alert');
    await waitFor(() => expect(likeButton()).toBeEnabled());

    await user.click(likeButton());
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await waitFor(() => expect(likeButton()).toBeEnabled());
    expect(likeButton()).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('1 like')).toBeInTheDocument();
  });

  it('can be toggled with the keyboard', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn(() => Promise.resolve());
    render(<LikeButton onToggle={onToggle} />);
    likeButton().focus();
    await user.keyboard('{Enter}');
    expect(onToggle).toHaveBeenCalledWith(true);
    await waitFor(() => expect(likeButton()).toBeEnabled());
    expect(likeButton()).toHaveAttribute('aria-pressed', 'true');
  });
});
