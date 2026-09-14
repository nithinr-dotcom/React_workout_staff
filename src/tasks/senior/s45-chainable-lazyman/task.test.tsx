// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { RequestInitLike, ResponseLike } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);

describeTask('Part A: LazyMan', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs nothing synchronously, then greets and eats in order', async () => {
    const log = vi.fn();
    impl.LazyMan('Jack', log).eat('banana').eat('apple');
    expect(log).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(log.mock.calls).toEqual([["Hi, I'm Jack."], ['Eat banana.'], ['Eat apple.']]);
  });

  it('sleep(n) waits n seconds before the tasks after it', async () => {
    const log = vi.fn();
    impl.LazyMan('Jack', log).eat('banana').sleep(10).eat('apple').sleep(1);
    await vi.advanceTimersByTimeAsync(0);
    expect(log.mock.calls).toEqual([["Hi, I'm Jack."], ['Eat banana.']]);

    await vi.advanceTimersByTimeAsync(9999);
    expect(log).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(log.mock.calls.slice(2)).toEqual([['Wake up after 10 seconds.'], ['Eat apple.']]);

    await vi.advanceTimersByTimeAsync(999);
    expect(log).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(1);
    expect(log).toHaveBeenLastCalledWith('Wake up after 1 second.');
  });

  it('sleepFirst runs before everything else, even the greeting, whenever it is called in the chain', async () => {
    const log = vi.fn();
    impl.LazyMan('Jack', log).eat('banana').sleep(10).eat('apple').sleepFirst(5);
    await vi.advanceTimersByTimeAsync(0);
    expect(log).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);
    expect(log.mock.calls).toEqual([['Wake up after 5 seconds.'], ["Hi, I'm Jack."], ['Eat banana.']]);

    await vi.advanceTimersByTimeAsync(10000);
    expect(log.mock.calls.slice(3)).toEqual([['Wake up after 10 seconds.'], ['Eat apple.']]);
  });

  it('runs several sleepFirst calls in the order they were made, before the normal queue', async () => {
    const log = vi.fn();
    impl.LazyMan('Ada', log).eat('rice').sleepFirst(2).sleepFirst(1);
    await vi.advanceTimersByTimeAsync(1999);
    expect(log).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(log.mock.calls).toEqual([['Wake up after 2 seconds.']]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(log.mock.calls).toEqual([['Wake up after 2 seconds.'], ['Wake up after 1 second.'], ["Hi, I'm Ada."], ['Eat rice.']]);
  });

  it('keeps separate LazyMan queues independent', async () => {
    const log = vi.fn();
    impl.LazyMan('A', (m) => log(`A: ${m}`)).sleep(2).eat('a');
    impl.LazyMan('B', (m) => log(`B: ${m}`)).sleep(1).eat('b');
    await vi.advanceTimersByTimeAsync(2000);
    expect(log.mock.calls.map(([m]) => m)).toEqual([
      "A: Hi, I'm A.",
      "B: Hi, I'm B.",
      'B: Wake up after 1 second.',
      'B: Eat b.',
      'A: Wake up after 2 seconds.',
      'A: Eat a.',
    ]);
  });
});

/* ---------- Part B helpers ---------- */

function jsonResponse(body: unknown, status = 200): ResponseLike {
  return { ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) };
}

function fakeFetch(...responses: (ResponseLike | Error)[]) {
  return vi.fn((url: string, init: RequestInitLike) => {
    void url;
    void init;
    const next = responses.length > 1 ? responses.shift()! : responses[0];
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  });
}

function requestAt(fetchImpl: ReturnType<typeof fakeFetch>, call: number) {
  const [url, init] = fetchImpl.mock.calls[call];
  const parsed = new URL(url);
  return {
    origin: parsed.origin,
    pathname: parsed.pathname,
    params: Object.fromEntries(parsed.searchParams),
    method: init.method.toUpperCase(),
    headers: new Headers(init.headers),
    body: init.body,
  };
}

const BASE = 'https://api.example.com';

describeTask('Part B: fluent API client', () => {
  it('get() builds the URL from baseUrl, path and query, sends headers, and resolves with the JSON body', async () => {
    const fetchImpl = fakeFetch(jsonResponse({ users: ['ada'] }));
    const client = impl.createApiClient(fetchImpl, { baseUrl: BASE });
    const data = await client.get('/users').query({ page: 2, active: true }).header('x-trace', 'abc').send();

    expect(data).toEqual({ users: ['ada'] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const req = requestAt(fetchImpl, 0);
    expect(req.origin + req.pathname).toBe(`${BASE}/users`);
    expect(req.params).toEqual({ page: '2', active: 'true' });
    expect(req.method).toBe('GET');
    expect(req.headers.get('x-trace')).toBe('abc');
  });

  it('merges repeated query() and header() calls, later values winning', async () => {
    const fetchImpl = fakeFetch(jsonResponse({}));
    const client = impl.createApiClient(fetchImpl, { baseUrl: BASE });
    await client.get('/items').query({ page: 1, sort: 'name' }).query({ page: 3 }).header('a', '1').header('b', '2').header('a', '3').send();
    const req = requestAt(fetchImpl, 0);
    expect(req.params).toEqual({ page: '3', sort: 'name' });
    expect(req.headers.get('a')).toBe('3');
    expect(req.headers.get('b')).toBe('2');
  });

  it('is immutable: branching from a builder never changes the parent or siblings', async () => {
    const fetchImpl = fakeFetch(jsonResponse({}));
    const client = impl.createApiClient(fetchImpl, { baseUrl: BASE });
    const base = client.get('/users').header('authorization', 'Bearer t');
    const page1 = base.query({ page: 1 });
    const admins = base.query({ role: 'admin' }).header('x-admin', 'yes');

    await base.send();
    await page1.send();
    await admins.send();

    const [r0, r1, r2] = [0, 1, 2].map((i) => requestAt(fetchImpl, i));
    expect(r0.params).toEqual({});
    expect(r0.headers.get('x-admin')).toBeNull();
    expect(r1.params).toEqual({ page: '1' });
    expect(r1.headers.get('x-admin')).toBeNull();
    expect(r2.params).toEqual({ role: 'admin' });
    expect(r2.headers.get('x-admin')).toBe('yes');
    [r0, r1, r2].forEach((r) => expect(r.headers.get('authorization')).toBe('Bearer t'));
  });

  it('is lazy and thenable: nothing is sent until send() or await, and await sends once', async () => {
    const fetchImpl = fakeFetch(jsonResponse({ id: 7 }));
    const client = impl.createApiClient(fetchImpl, { baseUrl: BASE });
    const builder = client.get('/users/7').header('x', 'y');
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchImpl).not.toHaveBeenCalled();

    const user = await builder;
    expect(user).toEqual({ id: 7 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    await expect(client.get('/users/7')).resolves.toEqual({ id: 7 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('post() sends a JSON body with a JSON content type', async () => {
    const fetchImpl = fakeFetch(jsonResponse({ ok: true }, 201));
    const client = impl.createApiClient(fetchImpl, { baseUrl: BASE });
    await expect(client.post('/users', { name: 'Ada' }).send()).resolves.toEqual({ ok: true });
    const req = requestAt(fetchImpl, 0);
    expect(req.method).toBe('POST');
    expect(JSON.parse(req.body as string)).toEqual({ name: 'Ada' });
    expect(req.headers.get('content-type')).toMatch(/application\/json/);
  });

  it('rejects non-ok responses with an error carrying status, and never retries 4xx', async () => {
    const fetchImpl = fakeFetch(jsonResponse({ message: 'nope' }, 404));
    const client = impl.createApiClient(fetchImpl, { baseUrl: BASE });
    const error = await client
      .get('/missing')
      .retry(3)
      .send()
      .then(
        () => null,
        (e: unknown) => e,
      );
    expect(error).toBeInstanceOf(Error);
    expect((error as { status: number }).status).toBe(404);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retry(n) retries network errors and 5xx up to n extra times', async () => {
    const flaky = fakeFetch(new TypeError('Failed to fetch'), jsonResponse({}, 503), jsonResponse({ done: true }));
    const client = impl.createApiClient(flaky, { baseUrl: BASE });
    await expect(client.get('/flaky').retry(2).send()).resolves.toEqual({ done: true });
    expect(flaky).toHaveBeenCalledTimes(3);

    const down = fakeFetch(jsonResponse({}, 500), jsonResponse({}, 502));
    const client2 = impl.createApiClient(down, { baseUrl: BASE });
    const error = await client2
      .get('/down')
      .retry(1)
      .send()
      .catch((e: unknown) => e);
    expect(down).toHaveBeenCalledTimes(2);
    expect((error as { status: number }).status).toBe(502);

    const noRetry = fakeFetch(new TypeError('Failed to fetch'), jsonResponse({}));
    const client3 = impl.createApiClient(noRetry, { baseUrl: BASE });
    await expect(client3.get('/once').send()).rejects.toThrow('Failed to fetch');
    expect(noRetry).toHaveBeenCalledTimes(1);
  });
});

describeFollowUp(1, 'timeout(ms)', () => {
  describe('with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('aborts the signal passed to fetch and rejects with a TimeoutError', async () => {
      let seenSignal: AbortSignal | undefined;
      const hanging = vi.fn((_url: string, init: RequestInitLike) => {
        seenSignal = init.signal;
        return new Promise<ResponseLike>(() => {});
      });
      const client = impl.createApiClient(hanging, { baseUrl: BASE });
      const outcome = client
        .get('/slow')
        .timeout(1000)
        .send()
        .then(
          () => 'resolved',
          (e: Error) => e.name,
        );
      await vi.advanceTimersByTimeAsync(999);
      expect(seenSignal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(seenSignal?.aborted).toBe(true);
      await expect(outcome).resolves.toBe('TimeoutError');
    });
  });
});
