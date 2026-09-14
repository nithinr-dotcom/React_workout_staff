import type { FileNode } from '../../../mocks/api';

export type { FileNode };

export interface FileExplorerProps {
  /** Starting tree. The component owns the tree after the first render. */
  initialTree: FileNode[];
  /** Folder ids that start expanded. Default: none. */
  defaultExpandedIds?: string[];
  /** Called when a file is activated (click or Enter). */
  onSelect?: (node: FileNode) => void;
}
