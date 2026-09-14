/** Shape resolved by `getJob` in src/mocks/api.ts. */
export interface Job {
  id: number;
  title: string;
  company: string;
  location: string;
  /** ISO date string. */
  postedAt: string;
  url: string;
}

export interface JobBoardProps {
  /** How many jobs to fetch per page. Default 6. */
  pageSize?: number;
}
