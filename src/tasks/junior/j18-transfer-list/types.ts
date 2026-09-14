export interface TransferListProps {
  /** Initial items in the left list. Items are unique strings across both lists. */
  leftItems: string[];
  /** Initial items in the right list. */
  rightItems: string[];
  /** Default 'Available'. */
  leftTitle?: string;
  /** Default 'Selected'. */
  rightTitle?: string;
}
