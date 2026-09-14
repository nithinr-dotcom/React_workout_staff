export interface LikeButtonProps {
  /** Whether the current user has already liked the item. Default false. */
  initialLiked?: boolean;
  /** Like count before any interaction. Default 0. */
  initialCount?: number;
  /**
   * Persists the new state. Called with the state the user is switching TO.
   * Resolves on success, rejects on failure.
   */
  onToggle: (liked: boolean) => Promise<unknown>;
}
