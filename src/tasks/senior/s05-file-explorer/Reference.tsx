import {
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { FileExplorerProps, FileNode } from './types';
import styles from './Reference.module.css';

/* ---------- normalized state ---------- */

interface TreeNode {
  id: string;
  name: string;
  type: FileNode['type'];
  parentId: string | null;
  childIds: string[];
}

interface TreeState {
  byId: Record<string, TreeNode>;
  rootIds: string[];
}

type TreeAction =
  | { type: 'create'; id: string; parentId: string | null; name: string; nodeType: FileNode['type'] }
  | { type: 'rename'; id: string; name: string }
  | { type: 'delete'; id: string };

function normalize(tree: FileNode[]): TreeState {
  const byId: Record<string, TreeNode> = {};
  const walk = (nodes: FileNode[], parentId: string | null): string[] =>
    nodes.map((node) => {
      byId[node.id] = {
        id: node.id,
        name: node.name,
        type: node.type,
        parentId,
        childIds: node.type === 'folder' ? walk(node.children ?? [], node.id) : [],
      };
      return node.id;
    });
  return { byId, rootIds: walk(tree, null) };
}

function collectSubtree(byId: Record<string, TreeNode>, id: string): string[] {
  const out: string[] = [];
  const stack = [id];
  while (stack.length) {
    const current = stack.pop()!;
    out.push(current);
    stack.push(...byId[current].childIds);
  }
  return out;
}

function treeReducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case 'create': {
      const node: TreeNode = { id: action.id, name: action.name, type: action.nodeType, parentId: action.parentId, childIds: [] };
      if (action.parentId === null) {
        return { byId: { ...state.byId, [node.id]: node }, rootIds: [...state.rootIds, node.id] };
      }
      const parent = state.byId[action.parentId];
      return {
        ...state,
        byId: { ...state.byId, [node.id]: node, [parent.id]: { ...parent, childIds: [...parent.childIds, node.id] } },
      };
    }
    case 'rename': {
      const node = state.byId[action.id];
      return { ...state, byId: { ...state.byId, [node.id]: { ...node, name: action.name } } };
    }
    case 'delete': {
      const node = state.byId[action.id];
      if (!node) return state;
      const removed = new Set(collectSubtree(state.byId, node.id));
      const byId: Record<string, TreeNode> = {};
      for (const [id, value] of Object.entries(state.byId)) if (!removed.has(id)) byId[id] = value;
      if (node.parentId === null) return { byId, rootIds: state.rootIds.filter((id) => id !== node.id) };
      const parent = byId[node.parentId];
      byId[parent.id] = { ...parent, childIds: parent.childIds.filter((id) => id !== node.id) };
      return { ...state, byId };
    }
  }
}

/* ---------- helpers ---------- */

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

interface VisibleItem {
  id: string;
  level: number;
  parentId: string | null;
}

type Editing =
  | { mode: 'create'; parentId: string | null; nodeType: FileNode['type'] }
  | { mode: 'rename'; id: string }
  | { mode: 'delete'; id: string }
  | null;

/* ---------- component ---------- */

export default function FileExplorer({ initialTree, defaultExpandedIds = [], onSelect }: FileExplorerProps) {
  const baseId = useId();
  const [tree, dispatch] = useReducer(treeReducer, initialTree, normalize);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(defaultExpandedIds));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);

  const itemRefs = useRef(new Map<string, HTMLLIElement>());
  const rootActionsRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);
  const idCounter = useRef(0);

  const { byId, rootIds } = tree;

  const sortIds = useMemo(() => {
    return (ids: string[]) =>
      [...ids].sort((a, b) => {
        const na = byId[a];
        const nb = byId[b];
        if (na.type !== nb.type) return na.type === 'folder' ? -1 : 1;
        return collator.compare(na.name, nb.name);
      });
  }, [byId]);

  // Flattened list of what is currently on screen, in visual order. Drives keyboard navigation.
  const visible = useMemo(() => {
    const out: VisibleItem[] = [];
    const walk = (ids: string[], level: number, parentId: string | null) => {
      for (const id of sortIds(ids)) {
        out.push({ id, level, parentId });
        if (byId[id].type === 'folder' && expanded.has(id)) walk(byId[id].childIds, level + 1, id);
      }
    };
    walk(rootIds, 1, null);
    return out;
  }, [byId, rootIds, expanded, sortIds]);

  const indexById = useMemo(() => new Map(visible.map((item, index) => [item.id, index])), [visible]);
  const tabbableId = focusedId !== null && indexById.has(focusedId) ? focusedId : (visible[0]?.id ?? null);

  // Focus restoration after a state change has been committed to the DOM.
  useEffect(() => {
    const id = pendingFocus.current;
    if (id === null) return;
    pendingFocus.current = null;
    if (id === '__root__') rootActionsRef.current?.querySelector('button')?.focus();
    else itemRefs.current.get(id)?.focus();
  });

  const focusItem = (id: string) => {
    setFocusedId(id);
    itemRefs.current.get(id)?.focus();
  };

  const scheduleFocus = (id: string | null) => {
    pendingFocus.current = id ?? '__root__';
    if (id) setFocusedId(id);
  };

  const toggle = (id: string, open?: boolean) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      const shouldOpen = open ?? !prev.has(id);
      if (shouldOpen) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const activate = (id: string) => {
    const node = byId[id];
    if (node.type === 'folder') toggle(id);
    else {
      setSelectedId(id);
      onSelect?.({ id: node.id, name: node.name, type: node.type });
    }
  };

  const validate = (name: string, parentId: string | null, excludeId?: string): string | null => {
    if (name.includes('/')) return 'Names cannot contain "/".';
    const siblings = parentId === null ? rootIds : byId[parentId].childIds;
    const lower = name.toLocaleLowerCase();
    const taken = siblings.some((id) => id !== excludeId && byId[id].name.toLocaleLowerCase() === lower);
    return taken ? `A file or folder named "${name}" already exists.` : null;
  };

  /* ----- create / rename / delete ----- */

  const startCreate = (parentId: string | null, nodeType: FileNode['type']) => {
    if (parentId !== null) toggle(parentId, true);
    setError(null);
    setEditing({ mode: 'create', parentId, nodeType });
  };

  const commitCreate = (raw: string) => {
    if (editing?.mode !== 'create') return;
    const name = raw.trim();
    if (!name) return cancelEditing();
    const problem = validate(name, editing.parentId);
    if (problem) return setError(problem);
    const id = `${baseId}new-${++idCounter.current}`;
    dispatch({ type: 'create', id, parentId: editing.parentId, name, nodeType: editing.nodeType });
    setEditing(null);
    setError(null);
    scheduleFocus(id);
  };

  const startRename = (id: string) => {
    setError(null);
    setEditing({ mode: 'rename', id });
  };

  const commitRename = (raw: string) => {
    if (editing?.mode !== 'rename') return;
    const node = byId[editing.id];
    const name = raw.trim();
    if (name && name !== node.name) {
      const problem = validate(name, node.parentId, node.id);
      if (problem) return setError(problem);
      dispatch({ type: 'rename', id: node.id, name });
    }
    setEditing(null);
    setError(null);
    scheduleFocus(node.id);
  };

  const cancelEditing = () => {
    if (editing === null) return;
    const returnTo = editing.mode === 'create' ? editing.parentId : editing.id;
    setEditing(null);
    setError(null);
    scheduleFocus(returnTo);
  };

  const confirmDelete = (id: string) => {
    const index = indexById.get(id);
    let target: string | null = null;
    if (index !== undefined) {
      const { level } = visible[index];
      // Next item that is not inside the deleted subtree, otherwise the previous one.
      const next = visible.slice(index + 1).find((item) => item.level <= level);
      target = next?.id ?? visible[index - 1]?.id ?? null;
    }
    dispatch({ type: 'delete', id });
    setEditing(null);
    if (selectedId !== null && collectSubtree(byId, id).includes(selectedId)) setSelectedId(null);
    scheduleFocus(target);
  };

  /* ----- events ----- */

  const onItemKeyDown = (event: KeyboardEvent<HTMLLIElement>, id: string) => {
    if (event.target !== event.currentTarget) return; // keys typed in inputs/buttons inside the row
    const index = indexById.get(id);
    if (index === undefined) return;
    const item = visible[index];
    const node = byId[id];
    const isOpenFolder = node.type === 'folder' && expanded.has(id);

    switch (event.key) {
      case 'ArrowDown':
        if (visible[index + 1]) focusItem(visible[index + 1].id);
        break;
      case 'ArrowUp':
        if (visible[index - 1]) focusItem(visible[index - 1].id);
        break;
      case 'ArrowRight':
        if (node.type !== 'folder') break;
        if (!isOpenFolder) toggle(id, true);
        else if (visible[index + 1]?.parentId === id) focusItem(visible[index + 1].id);
        break;
      case 'ArrowLeft':
        if (isOpenFolder) toggle(id, false);
        else if (item.parentId !== null) focusItem(item.parentId);
        break;
      case 'Home':
        if (visible.length) focusItem(visible[0].id);
        break;
      case 'End':
        if (visible.length) focusItem(visible[visible.length - 1].id);
        break;
      case 'Enter':
        activate(id);
        break;
      case 'F2':
        startRename(id);
        break;
      case 'Delete':
        setEditing({ mode: 'delete', id });
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const onItemClick = (event: MouseEvent<HTMLLIElement>, id: string) => {
    const target = event.target as HTMLElement;
    if (target.closest('[role="treeitem"]') !== event.currentTarget) return; // bubbled from a child item
    if (target.closest('button, input, [role="alertdialog"]')) return;
    activate(id);
  };

  /* ----- rendering ----- */

  const createRow = (parentId: string | null, level: number): ReactNode => {
    if (editing?.mode !== 'create' || editing.parentId !== parentId) return null;
    return (
      <li role="none" className={styles.inputRow} style={{ paddingInlineStart: indent(level) }}>
        <span className={editing.nodeType === 'folder' ? styles.folderIcon : styles.fileIcon} aria-hidden="true" />
        <NameInput
          label={editing.nodeType === 'folder' ? 'New folder name' : 'New file name'}
          defaultValue=""
          error={error}
          onChange={() => setError(null)}
          onCommit={commitCreate}
          onCancel={cancelEditing}
        />
      </li>
    );
  };

  const renderLevel = (ids: string[], level: number): ReactNode =>
    sortIds(ids).map((id) => {
      const node = byId[id];
      const isFolder = node.type === 'folder';
      const isOpen = isFolder && expanded.has(id);
      const isTabbable = id === tabbableId;
      const isRenaming = editing?.mode === 'rename' && editing.id === id;
      const isDeleting = editing?.mode === 'delete' && editing.id === id;
      const actionTab = isTabbable ? 0 : -1;

      return (
        <li
          key={id}
          ref={(el) => {
            if (el) itemRefs.current.set(id, el);
            else itemRefs.current.delete(id);
          }}
          role="treeitem"
          aria-label={node.name}
          aria-level={level}
          aria-selected={selectedId === id}
          aria-expanded={isFolder ? isOpen : undefined}
          tabIndex={isTabbable ? 0 : -1}
          className={styles.item}
          onClick={(e) => onItemClick(e, id)}
          onKeyDown={(e) => onItemKeyDown(e, id)}
          onFocus={(e) => {
            if (e.target === e.currentTarget) setFocusedId(id);
          }}
        >
          <div
            className={`${styles.row} ${selectedId === id ? styles.selected : ''}`}
            style={{ paddingInlineStart: indent(level) }}
          >
            <span className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`} aria-hidden="true">
              {isFolder ? '▸' : ''}
            </span>
            <span className={isFolder ? styles.folderIcon : styles.fileIcon} aria-hidden="true" />
            {isRenaming ? (
              <NameInput
                label={`New name for ${node.name}`}
                defaultValue={node.name}
                error={error}
                onChange={() => setError(null)}
                onCommit={commitRename}
                onCancel={cancelEditing}
              />
            ) : (
              <span className={styles.name}>{node.name}</span>
            )}
            {!isRenaming && (
              <span className={styles.actions}>
                {isFolder && (
                  <>
                    <IconButton label={`New file in ${node.name}`} tabIndex={actionTab} onClick={() => startCreate(id, 'file')}>
                      +F
                    </IconButton>
                    <IconButton label={`New folder in ${node.name}`} tabIndex={actionTab} onClick={() => startCreate(id, 'folder')}>
                      +D
                    </IconButton>
                  </>
                )}
                <IconButton label={`Rename ${node.name}`} tabIndex={actionTab} onClick={() => startRename(id)}>
                  ✎
                </IconButton>
                <IconButton label={`Delete ${node.name}`} tabIndex={actionTab} onClick={() => setEditing({ mode: 'delete', id })}>
                  ✕
                </IconButton>
              </span>
            )}
          </div>

          {isDeleting && (
            <DeleteConfirm
              name={node.name}
              isFolder={isFolder}
              level={level}
              onConfirm={() => confirmDelete(id)}
              onCancel={cancelEditing}
            />
          )}

          {isOpen && (
            <ul role="group" className={styles.group}>
              {createRow(id, level + 1)}
              {node.childIds.length === 0 && !(editing?.mode === 'create' && editing.parentId === id) ? (
                <li role="none" className={styles.empty} style={{ paddingInlineStart: indent(level + 1) }}>
                  Empty folder
                </li>
              ) : (
                renderLevel(node.childIds, level + 1)
              )}
            </ul>
          )}
        </li>
      );
    });

  return (
    <div className={styles.explorer}>
      <div className={styles.toolbar} ref={rootActionsRef}>
        <span className={styles.toolbarTitle}>Explorer</span>
        <IconButton label="New file at root" onClick={() => startCreate(null, 'file')}>
          +F
        </IconButton>
        <IconButton label="New folder at root" onClick={() => startCreate(null, 'folder')}>
          +D
        </IconButton>
      </div>
      {rootIds.length === 0 && editing?.mode !== 'create' ? (
        <p className={styles.emptyTree}>No files</p>
      ) : (
        <ul role="tree" aria-label="Files" className={styles.tree}>
          {createRow(null, 1)}
          {renderLevel(rootIds, 1)}
        </ul>
      )}
    </div>
  );
}

const indent = (level: number) => `${(level - 1) * 16 + 8}px`;

/* ---------- small pieces ---------- */

function IconButton({
  label,
  tabIndex,
  onClick,
  children,
}: {
  label: string;
  tabIndex?: number;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={styles.iconButton} aria-label={label} title={label} tabIndex={tabIndex} onClick={onClick}>
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

function NameInput({
  label,
  defaultValue,
  error,
  onChange,
  onCommit,
  onCancel,
}: {
  label: string;
  defaultValue: string;
  error: string | null;
  onChange: () => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    // Select the base name (before the extension), like VS Code.
    const dot = input.value.lastIndexOf('.');
    input.setSelectionRange(0, dot > 0 ? dot : input.value.length);
  }, []);

  return (
    <span className={styles.inputWrap}>
      <input
        ref={inputRef}
        className={styles.input}
        aria-label={label}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onCommit(value);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
      />
      {error && (
        <span id={errorId} role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </span>
  );
}

function DeleteConfirm({
  name,
  isFolder,
  level,
  onConfirm,
  onCancel,
}: {
  name: string;
  isFolder: boolean;
  level: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus(); // the safe choice gets focus for a destructive action
  }, []);

  // Escape is handled on the buttons (the only focusable elements in the confirmation).
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className={styles.confirm}
      style={{ marginInlineStart: indent(level + 1) }}
    >
      <strong id={titleId}>{`Delete ${name}?`}</strong>
      <span id={descId} className={styles.confirmText}>
        {isFolder ? 'Everything inside this folder will be deleted too.' : 'This cannot be undone.'}
      </span>
      <span className={styles.confirmActions}>
        <button type="button" className={styles.danger} onClick={onConfirm} onKeyDown={onKeyDown}>
          Delete
        </button>
        <button type="button" ref={cancelRef} onClick={onCancel} onKeyDown={onKeyDown}>
          Cancel
        </button>
      </span>
    </div>
  );
}
