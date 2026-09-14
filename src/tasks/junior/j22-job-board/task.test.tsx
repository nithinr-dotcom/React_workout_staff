// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { ApiError, getJob, getJobIds } from '../../../mocks/api';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Job } from './types';

vi.mock('../../../mocks/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../mocks/api')>();
  return { ...actual, getJobIds: vi.fn(), getJob: vi.fn() };
});

const { impl, describeTask } = pickTarget(Solution, Reference);
const JobBoard = impl.default;
const idsMock = vi.mocked(getJobIds);
const jobMock = vi.mocked(getJob);

const makeJob = (id: number): Job => ({
  id,
  title: `Job ${id}`,
  company: `Company ${id}`,
  location: id % 2 ? 'Remote' : 'Berlin',
  postedAt: new Date(Date.UTC(2026, 8, 1) - id * 86_400_000).toISOString(),
  url: `https://jobs.example.com/${id}`,
});

const ids = (n: number) => Array.from({ length: n }, (_, i) => 100 + i);

/** Settle getJob calls manually, by id. */
function deferJobs() {
  const resolvers = new Map<number, () => void>();
  jobMock.mockImplementation(
    (id) =>
      new Promise<Job>((resolve) => {
        resolvers.set(id, () => resolve(makeJob(id)));
      }),
  );
  return {
    requested: () => [...resolvers.keys()],
    resolve: async (id: number) => {
      await act(async () => resolvers.get(id)!());
    },
  };
}

beforeEach(() => {
  idsMock.mockReset();
  jobMock.mockReset();
});

const jobLinks = () => screen.queryAllByRole('link');
const loadMore = () => screen.getByRole('button', { name: 'Load more jobs' });

describeTask('JobBoard', () => {
  it('shows the heading and loading state, then the first 6 jobs in order', async () => {
    idsMock.mockResolvedValue(ids(14));
    jobMock.mockImplementation(async (id) => makeJob(id));
    render(<JobBoard />);
    expect(screen.getByRole('heading', { level: 1, name: 'Job Board' })).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    expect(await screen.findByRole('link', { name: 'Job 100' })).toBeInTheDocument();
    expect(jobLinks().map((a) => a.textContent)).toEqual(['Job 100', 'Job 101', 'Job 102', 'Job 103', 'Job 104', 'Job 105']);
    expect(idsMock).toHaveBeenCalledTimes(1);
    expect(jobMock.mock.calls.map((c) => c[0]).sort()).toEqual([100, 101, 102, 103, 104, 105]);
  });

  it('renders each job with a safe external link, company and location', async () => {
    idsMock.mockResolvedValue(ids(1));
    jobMock.mockImplementation(async (id) => makeJob(id));
    render(<JobBoard />);
    const link = await screen.findByRole('link', { name: 'Job 100' });
    expect(link).toHaveAttribute('href', 'https://jobs.example.com/100');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toMatch(/noopener/);
    const item = link.closest('li')!;
    expect(item).not.toBeNull();
    expect(within(item).getByText(/Company 100/)).toBeInTheDocument();
    expect(within(item).getByText(/Berlin/)).toBeInTheDocument();
  });

  it('fetches a page in parallel and only shows it once every job has loaded', async () => {
    idsMock.mockResolvedValue(ids(6));
    const jobs = deferJobs();
    render(<JobBoard />);
    await vi.waitFor(() => expect(jobs.requested()).toHaveLength(6));

    for (const id of [105, 104, 103, 102, 101]) await jobs.resolve(id);
    expect(jobLinks()).toHaveLength(0);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await jobs.resolve(100);
    expect(jobLinks()).toHaveLength(6);
    expect(jobLinks()[0]).toHaveTextContent('Job 100');
  });

  it('loads the next page with "Load more jobs" without refetching ids', async () => {
    idsMock.mockResolvedValue(ids(14));
    const jobs = deferJobs();
    render(<JobBoard />);
    await vi.waitFor(() => expect(jobs.requested()).toHaveLength(6));
    for (const id of jobs.requested()) await jobs.resolve(id);
    expect(jobLinks()).toHaveLength(6);

    const user = userEvent.setup();
    await user.click(loadMore());
    const busy = screen.getByRole('button', { name: /loading/i });
    expect(busy).toBeDisabled();
    await user.click(busy);
    expect(jobs.requested()).toHaveLength(12);
    expect(jobLinks()).toHaveLength(6);

    for (const id of jobs.requested().slice(6)) await jobs.resolve(id);
    expect(jobLinks()).toHaveLength(12);
    expect(jobLinks()[6]).toHaveTextContent('Job 106');
    expect(idsMock).toHaveBeenCalledTimes(1);
    expect(jobMock).toHaveBeenCalledTimes(12);
  });

  it('removes the button after the last (short) page', async () => {
    idsMock.mockResolvedValue(ids(8));
    jobMock.mockImplementation(async (id) => makeJob(id));
    const user = userEvent.setup();
    render(<JobBoard />);
    await screen.findByRole('link', { name: 'Job 105' });
    await user.click(loadMore());
    expect(await screen.findByRole('link', { name: 'Job 107' })).toBeInTheDocument();
    expect(jobLinks()).toHaveLength(8);
    expect(screen.queryByRole('button', { name: 'Load more jobs' })).not.toBeInTheDocument();
  });

  it('respects pageSize and hides the button when everything fits', async () => {
    idsMock.mockResolvedValue(ids(3));
    jobMock.mockImplementation(async (id) => makeJob(id));
    render(<JobBoard pageSize={3} />);
    await screen.findByRole('link', { name: 'Job 102' });
    expect(jobLinks()).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Load more jobs' })).not.toBeInTheDocument();
  });

  it('shows "No jobs yet." for an empty id list', async () => {
    idsMock.mockResolvedValue([]);
    render(<JobBoard />);
    expect(await screen.findByText('No jobs yet.')).toBeInTheDocument();
    expect(jobMock).not.toHaveBeenCalled();
  });

  it('shows an error with Retry when the id list fails', async () => {
    idsMock.mockRejectedValueOnce(new ApiError('down', 500)).mockResolvedValueOnce(ids(2));
    jobMock.mockImplementation(async (id) => makeJob(id));
    const user = userEvent.setup();
    render(<JobBoard />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load jobs.');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'Job 101' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps loaded jobs when a later page fails, and Retry loads that page once', async () => {
    idsMock.mockResolvedValue(ids(12));
    let failNext = false;
    jobMock.mockImplementation(async (id) => {
      if (failNext && id === 108) {
        failNext = false;
        throw new ApiError('flaky', 500);
      }
      return makeJob(id);
    });
    const user = userEvent.setup();
    render(<JobBoard />);
    await screen.findByRole('link', { name: 'Job 105' });

    failNext = true;
    await user.click(loadMore());
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load jobs.');
    expect(jobLinks()).toHaveLength(6);

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: 'Job 111' })).toBeInTheDocument();
    expect(jobLinks().map((a) => a.textContent)).toEqual(ids(12).map((id) => `Job ${id}`));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(idsMock).toHaveBeenCalledTimes(1);
  });
});
