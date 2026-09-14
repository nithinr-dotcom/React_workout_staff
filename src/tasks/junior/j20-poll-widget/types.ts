export interface PollOption {
  id: string;
  label: string;
  /** Votes from other people. Never includes the current user's vote. */
  votes: number;
}

export interface PollWidgetProps {
  /** Identifies the poll. The user's vote is stored under `poll:${pollId}` in localStorage. */
  pollId: string;
  question: string;
  options: PollOption[];
}
