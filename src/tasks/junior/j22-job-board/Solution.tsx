import type { Job, JobBoardProps } from "./types";
import styles from "./Solution.module.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { getJob, getJobIds } from "../../../mocks/api";

type Status = "loading" | "idle" | "error";
// What failed last, so Retry repeats only that step.
type FailedStep = "ids" | "page";

// Created once at module level (building a formatter is not free).
// timeZone "UTC" so an ISO date like 2026-09-01T00:00Z shows as Sep 1 everywhere,
// not Aug 31 for users west of London.
const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default function JobBoard({ pageSize = 6 }: JobBoardProps) {
  // 1. STATE: the id list is fetched once, jobs grow one whole page at a time.
  //    ids === null means "not loaded yet" (different from an empty list).
  const [ids, setIds] = useState<number[] | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [failedStep, setFailedStep] = useState<FailedStep | null>(null);

  // 2. REFS, not state, for things the UI doesn't render:
  //    - inFlightRef blocks a second click before React has re-rendered the
  //      disabled button (state updates are not instant, a ref is).
  //    - controllerRef holds the AbortController of the mounted component, so
  //      "Load more" requests are cancelled on unmount too.
  const inFlightRef = useRef(false);
  const controllerRef = useRef<AbortController | null>(null);

  // 3. LOAD ONE PAGE: all getJob calls start at once (Promise.all = parallel).
  //    The page is appended only when EVERY job is back, so the list never
  //    jumps around and a failed page adds nothing (no duplicates on retry).
  const loadPage = useCallback(
    async (allIds: number[], start: number, signal: AbortSignal) => {
      inFlightRef.current = true;
      try {
        const pageIds = allIds.slice(start, start + pageSize);
        const page = await Promise.all(pageIds.map((id) => getJob(id, { signal })));
        if (signal.aborted) return; // unmounted meanwhile: don't touch state
        setJobs((prev) => [...prev, ...page]);
        setStatus("idle");
      } catch {
        if (signal.aborted) return; // an abort is not a real error
        setFailedStep("page");
        setStatus("error");
      } finally {
        inFlightRef.current = false;
      }
    },
    [pageSize],
  );

  // 4. TWO-STEP FETCH: ids first, then the first page of details.
  const loadIds = useCallback(
    async (signal: AbortSignal) => {
      let list: number[];
      try {
        list = await getJobIds({ signal });
      } catch {
        if (signal.aborted) return;
        setFailedStep("ids");
        setStatus("error");
        return;
      }
      if (signal.aborted) return;
      setIds(list);
      setJobs([]); // start clean if this ever re-runs (e.g. pageSize changed)
      if (list.length === 0) {
        setStatus("idle");
        return;
      }
      await loadPage(list, 0, signal);
    },
    [loadPage],
  );

  // 5. EFFECT: fetch on mount, abort on unmount.
  //    In StrictMode (dev) React mounts, unmounts and mounts again. The first
  //    run is aborted by its cleanup, so only the second run updates the UI.
  useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    void loadIds(controller.signal);
    return () => controller.abort();
  }, [loadIds]);

  const handleLoadMore = () => {
    const controller = controllerRef.current;
    if (!ids || !controller || inFlightRef.current) return; // double-click guard
    setStatus("loading");
    // Start from what is SHOWN, so a failed page is simply asked for again.
    void loadPage(ids, jobs.length, controller.signal);
  };

  const handleRetry = () => {
    const controller = controllerRef.current;
    if (!controller || inFlightRef.current) return;
    setStatus("loading");
    setFailedStep(null);
    if (failedStep === "ids" || !ids) void loadIds(controller.signal);
    else void loadPage(ids, jobs.length, controller.signal);
  };

  const loading = status === "loading";
  const firstLoad = loading && jobs.length === 0;
  const hasMore = ids !== null && jobs.length > 0 && jobs.length < ids.length;

  return (
    <section className={styles.root}>
      <h1 className={styles.title}>Job Board</h1>

      {/* 6. LIVE REGION: always in the DOM, so screen readers notice when its
          text changes. Only the first load uses it; "load more" shows its
          progress on the button itself. */}
      <p role="status" className={styles.status}>
        {firstLoad ? "Loading…" : ""}
      </p>

      {ids !== null && ids.length === 0 && <p className={styles.empty}>No jobs yet.</p>}

      {jobs.length > 0 && (
        <ul className={styles.list}>
          {jobs.map((job) => (
            <li key={job.id}>
              <article className={styles.card}>
                <h2 className={styles.jobTitle}>
                  {/* 7. SAFE EXTERNAL LINK: noopener stops the new tab from
                      reaching back through window.opener; noreferrer hides our URL. */}
                  <a href={job.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    {job.title}
                  </a>
                </h2>
                <p className={styles.meta}>
                  {job.company} · {job.location} ·{" "}
                  <time dateTime={job.postedAt}>{dateFormat.format(new Date(job.postedAt))}</time>
                </p>
              </article>
            </li>
          ))}
        </ul>
      )}

      {status === "error" && (
        <div role="alert" className={styles.error}>
          <p>Failed to load jobs.</p>
          <button type="button" className={styles.button} onClick={handleRetry}>
            Retry
          </button>
        </div>
      )}

      {/* 8. The SAME button element stays mounted while loading (only its text
          and disabled flag change), so the list grows above it and the
          page / focus position doesn't jump. It also stays during an error
          (it does the same thing as Retry), so keyboard focus is never lost. */}
      {hasMore && (
        <button type="button" className={styles.button} onClick={handleLoadMore} disabled={loading}>
          {loading ? "Loading…" : "Load more jobs"}
        </button>
      )}
    </section>
  );
}
