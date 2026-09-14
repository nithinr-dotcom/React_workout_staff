// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { ChunkedUploaderProps, UploadChunk, UploadChunkArgs } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const ChunkedUploader = impl.default;

interface Call extends UploadChunkArgs {
  settled: boolean;
  resolve(): void;
  reject(error?: unknown): void;
}

/** An uploadChunk mock whose calls stay pending until the test settles them. */
function manualServer() {
  const calls: Call[] = [];
  let maxInFlight = 0;
  const inFlight = () => calls.filter((c) => !c.settled);
  const uploadChunk = vi.fn<UploadChunk>(
    (args) =>
      new Promise<void>((res, rej) => {
        const call: Call = {
          ...args,
          settled: false,
          resolve() {
            if (call.settled) return;
            call.settled = true;
            res();
          },
          reject(error = new Error('500')) {
            if (call.settled) return;
            call.settled = true;
            rej(error);
          },
        };
        args.signal.addEventListener('abort', () => call.reject(new DOMException('Aborted', 'AbortError')));
        calls.push(call);
        if (args.signal.aborted) call.reject(new DOMException('Aborted', 'AbortError'));
        maxInFlight = Math.max(maxInFlight, inFlight().length);
      }),
  );
  return { uploadChunk, calls, inFlight, maxInFlight: () => maxInFlight };
}

const file = (name: string, size: number, type = 'text/plain') => new File(['x'.repeat(size)], name, { type });

function renderUploader(props: Partial<ChunkedUploaderProps> & { uploadChunk: UploadChunk }) {
  const user = userEvent.setup({ applyAccept: false });
  render(<ChunkedUploader chunkSize={4} retryDelayMs={0} {...props} />);
  return { user };
}

const row = (name: string) =>
  within(screen.getByRole('list', { name: 'Uploads' }))
    .getAllByRole('listitem')
    .find((li) => li.textContent?.includes(name))!;
const progress = (name: string) => Number(screen.getByRole('progressbar', { name }).getAttribute('aria-valuenow'));
const settle = async (fn: () => void) => {
  await act(async () => {
    fn();
    await new Promise((r) => setTimeout(r, 0));
  });
};

describeTask('ChunkedUploader', () => {
  it('slices a file into chunks and uploads them with one fileId', async () => {
    const server = manualServer();
    const { user } = renderUploader({ uploadChunk: server.uploadChunk, concurrency: 3 });
    await user.upload(screen.getByLabelText('Choose files'), file('notes.txt', 10));
    await waitFor(() => expect(server.calls).toHaveLength(3));
    expect(server.calls.map((c) => c.index)).toEqual([0, 1, 2]);
    expect(server.calls.map((c) => c.blob.size)).toEqual([4, 4, 2]);
    expect(new Set(server.calls.map((c) => c.fileId)).size).toBe(1);
    expect(row('notes.txt')).toHaveTextContent('Uploading');
    expect(progress('notes.txt')).toBe(0);
  });

  it('updates per-file and overall progress by acknowledged bytes and completes', async () => {
    const server = manualServer();
    const { user } = renderUploader({ uploadChunk: server.uploadChunk, concurrency: 3 });
    await user.upload(screen.getByLabelText('Choose files'), file('notes.txt', 10));
    await waitFor(() => expect(server.calls).toHaveLength(3));
    await settle(() => server.calls[0].resolve());
    expect(progress('notes.txt')).toBe(40);
    expect(progress('Overall progress')).toBe(40);
    await settle(() => server.calls[2].resolve());
    expect(progress('notes.txt')).toBe(60);
    await settle(() => server.calls[1].resolve());
    expect(progress('notes.txt')).toBe(100);
    expect(progress('Overall progress')).toBe(100);
    expect(row('notes.txt')).toHaveTextContent('Complete');
  });

  it('weights overall progress by bytes across files', async () => {
    const server = manualServer();
    const { user } = renderUploader({ uploadChunk: server.uploadChunk, concurrency: 3 });
    await user.upload(screen.getByLabelText('Choose files'), [file('big.txt', 8), file('small.txt', 2)]);
    await waitFor(() => expect(server.calls).toHaveLength(3));
    const smallId = server.calls.find((c) => c.blob.size === 2)!.fileId;
    await settle(() => server.calls.find((c) => c.fileId === smallId)!.resolve());
    expect(progress('small.txt')).toBe(100);
    expect(progress('big.txt')).toBe(0);
    expect(progress('Overall progress')).toBe(20);
  });

  it('never exceeds the global concurrency limit', async () => {
    const server = manualServer();
    const { user } = renderUploader({ uploadChunk: server.uploadChunk, concurrency: 2 });
    await user.upload(screen.getByLabelText('Choose files'), [file('a.txt', 10), file('b.txt', 10)]);
    await waitFor(() => expect(server.calls).toHaveLength(2));
    expect(server.calls.map((c) => c.index)).toEqual([0, 1]);
    for (let guard = 0; guard < 20 && server.calls.filter((c) => c.settled).length < 6; guard++) {
      const pending = server.inFlight();
      expect(pending.length).toBeLessThanOrEqual(2);
      if (pending.length) await settle(() => pending[0].resolve());
      else await settle(() => {});
    }
    expect(server.calls).toHaveLength(6);
    expect(server.maxInFlight()).toBeLessThanOrEqual(2);
    expect(new Set(server.calls.map((c) => c.fileId)).size).toBe(2);
    expect(row('a.txt')).toHaveTextContent('Complete');
    expect(row('b.txt')).toHaveTextContent('Complete');
  });

  it('pauses by aborting in-flight chunks and resumes without re-uploading acknowledged ones', async () => {
    const server = manualServer();
    const { user } = renderUploader({ uploadChunk: server.uploadChunk, concurrency: 1 });
    await user.upload(screen.getByLabelText('Choose files'), file('clip.txt', 10));
    await waitFor(() => expect(server.calls).toHaveLength(1));
    await settle(() => server.calls[0].resolve());
    await waitFor(() => expect(server.calls).toHaveLength(2));
    const second = server.calls[1];
    expect(second.index).toBe(1);

    await user.click(screen.getByRole('button', { name: 'Pause clip.txt' }));
    expect(second.signal.aborted).toBe(true);
    expect(row('clip.txt')).toHaveTextContent('Paused');
    await settle(() => {});
    expect(server.calls).toHaveLength(2);
    expect(progress('clip.txt')).toBe(40);
    expect(row('clip.txt')).not.toHaveTextContent('Failed');

    await user.click(screen.getByRole('button', { name: 'Resume clip.txt' }));
    await waitFor(() => expect(server.calls).toHaveLength(3));
    expect(server.calls[2].index).toBe(1);
    await settle(() => server.calls[2].resolve());
    await waitFor(() => expect(server.calls).toHaveLength(4));
    await settle(() => server.calls[3].resolve());
    expect(server.calls.map((c) => c.index)).toEqual([0, 1, 1, 2]);
    expect(row('clip.txt')).toHaveTextContent('Complete');
  });

  it('cancels a file: aborts its requests, removes the row and uploads nothing more', async () => {
    const server = manualServer();
    const { user } = renderUploader({ uploadChunk: server.uploadChunk, concurrency: 2 });
    await user.upload(screen.getByLabelText('Choose files'), file('draft.txt', 12));
    await waitFor(() => expect(server.calls).toHaveLength(2));
    await user.click(screen.getByRole('button', { name: 'Cancel draft.txt' }));
    expect(server.calls.every((c) => c.signal.aborted)).toBe(true);
    await settle(() => {});
    expect(screen.queryByText(/draft\.txt/)).not.toBeInTheDocument();
    expect(server.calls).toHaveLength(2);
  });

  it('retries a failing chunk up to 3 times and still completes', async () => {
    const attempts: Record<number, number> = {};
    const uploadChunk = vi.fn<UploadChunk>(async ({ index }) => {
      attempts[index] = (attempts[index] ?? 0) + 1;
      if (index === 0 && attempts[0] <= 3) throw new Error('500');
    });
    const { user } = renderUploader({ uploadChunk, concurrency: 2 });
    await user.upload(screen.getByLabelText('Choose files'), file('photo.txt', 8));
    await waitFor(() => expect(row('photo.txt')).toHaveTextContent('Complete'));
    expect(attempts).toEqual({ 0: 4, 1: 1 });
    expect(progress('photo.txt')).toBe(100);
  });

  it('marks the file Failed after retries run out, and Retry skips acknowledged chunks', async () => {
    let failing = true;
    const attempts: Record<number, number> = {};
    const uploadChunk = vi.fn<UploadChunk>(async ({ index }) => {
      attempts[index] = (attempts[index] ?? 0) + 1;
      if (index === 1 && failing) throw new Error('500');
    });
    const { user } = renderUploader({ uploadChunk, concurrency: 1 });
    await user.upload(screen.getByLabelText('Choose files'), file('video.txt', 12));
    await waitFor(() => expect(row('video.txt')).toHaveTextContent('Failed'));
    expect(attempts[0]).toBe(1);
    expect(attempts[1]).toBe(4);
    // Chunk 2 may or may not have been uploaded while chunk 1 waited for its retries.
    expect([33, 67]).toContain(progress('video.txt'));

    failing = false;
    await user.click(screen.getByRole('button', { name: 'Retry video.txt' }));
    await waitFor(() => expect(row('video.txt')).toHaveTextContent('Complete'));
    expect(attempts).toEqual({ 0: 1, 1: 5, 2: 1 });
  });

  it('validates type and size, and accepts dropped files', async () => {
    const server = manualServer();
    renderUploader({ uploadChunk: server.uploadChunk, maxFileSize: 5, accept: ['image/*'] });
    fireEvent.drop(screen.getByText(/drop files here/i), {
      dataTransfer: {
        files: [file('huge.png', 10, 'image/png'), file('notes.txt', 3, 'text/plain'), file('ok.png', 3, 'image/png'), file('blank.png', 0, 'image/png')],
        types: ['Files'],
      },
    });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('huge.png is too large');
    expect(alert).toHaveTextContent('notes.txt is not an allowed file type');
    expect(alert).toHaveTextContent('blank.png is empty');
    await waitFor(() => expect(server.calls).toHaveLength(1));
    const items = within(screen.getByRole('list', { name: 'Uploads' })).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent('ok.png');
    expect(server.calls[0].blob.size).toBe(3);
  });

  it('aborts in-flight requests on unmount', async () => {
    const server = manualServer();
    const user = userEvent.setup({ applyAccept: false });
    const { unmount } = render(<ChunkedUploader uploadChunk={server.uploadChunk} chunkSize={4} concurrency={2} retryDelayMs={0} />);
    await user.upload(screen.getByLabelText('Choose files'), file('late.txt', 10));
    await waitFor(() => expect(server.calls).toHaveLength(2));
    unmount();
    expect(server.calls.every((c) => c.signal.aborted)).toBe(true);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(server.calls).toHaveLength(2);
  });
});
