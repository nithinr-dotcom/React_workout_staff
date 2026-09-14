import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type { CommentNode, CommentSort, NestedCommentsProps } from './types';
import styles from './Reference.module.css';

/* ---------- normalized state ---------- */

interface Entry {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  votes: number;
  parentId: string | null;
  childIds: string[];
  deleted: boolean;
  edited: boolean;
  upvoted: boolean;
}

interface ThreadState {
  byId: Record<string, Entry>;
  rootIds: string[];
}

type ThreadAction =
  | { type: 'add'; id: string; parentId: string | null; author: string; text: string; createdAt: string }
  | { type: 'edit'; id: string; text: string }
  | { type: 'delete'; id: string }
  | { type: 'toggleVote'; id: string };

function normalize(comments: CommentNode[]): ThreadState {
  const byId: Record<string, Entry> = {};
  const walk = (nodes: CommentNode[], parentId: string | null): string[] =>
    nodes.map((node) => {
      byId[node.id] = {
        id: node.id,
        author: node.author,
        text: node.text,
        createdAt: node.createdAt,
        votes: node.votes,
        parentId,
        childIds: walk(node.replies ?? [], node.id),
        deleted: false,
        edited: false,
        upvoted: false,
      };
      return node.id;
    });
  return { byId, rootIds: walk(comments, null) };
}

function threadReducer(state: ThreadState, action: ThreadAction): ThreadState {
  const { byId } = state;
  switch (action.type) {
    case 'add': {
      const entry: Entry = {
        id: action.id,
        author: action.author,
        text: action.text,
        createdAt: action.createdAt,
        votes: 0,
        parentId: action.parentId,
        childIds: [],
        deleted: false,
        edited: false,
        upvoted: false,
      };
      if (action.parentId === null) {
        return { byId: { ...byId, [entry.id]: entry }, rootIds: [...state.rootIds, entry.id] };
      }
      const parent = byId[action.parentId];
      if (!parent) return state;
      return {
        ...state,
        byId: { ...byId, [entry.id]: entry, [parent.id]: { ...parent, childIds: [...parent.childIds, entry.id] } },
      };
    }
    case 'edit': {
      const entry = byId[action.id];
      if (!entry || entry.deleted || entry.text === action.text) return state;
      return { ...state, byId: { ...byId, [entry.id]: { ...entry, text: action.text, edited: true } } };
    }
    case 'toggleVote': {
      const entry = byId[action.id];
      if (!entry || entry.deleted) return state;
      const upvoted = !entry.upvoted;
      return {
        ...state,
        byId: { ...byId, [entry.id]: { ...entry, upvoted, votes: entry.votes + (upvoted ? 1 : -1) } },
      };
    }
    case 'delete': {
      const entry = byId[action.id];
      if (!entry || entry.deleted) return state;
      if (entry.childIds.length > 0) {
        return {
          ...state,
          byId: { ...byId, [entry.id]: { ...entry, deleted: true, text: '', author: '', upvoted: false } },
        };
      }
      // Remove the leaf, then prune placeholder ancestors that no longer have replies.
      const nextById = { ...byId };
      let rootIds = state.rootIds;
      let current: Entry | undefined = entry;
      while (current) {
        delete nextById[current.id];
        const parentId: string | null = current.parentId;
        if (parentId === null) {
          const removedId = current.id;
          rootIds = rootIds.filter((id) => id !== removedId);
          break;
        }
        const removedId = current.id;
        const parent: Entry = { ...nextById[parentId], childIds: nextById[parentId].childIds.filter((id) => id !== removedId) };
        nextById[parentId] = parent;
        current = parent.deleted && parent.childIds.length === 0 ? parent : undefined;
      }
      return { byId: nextById, rootIds };
    }
  }
}

/* ---------- helpers ---------- */

const dateFormat = new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function countDescendants(byId: Record<string, Entry>, id: string): number {
  let count = 0;
  const stack = [...byId[id].childIds];
  while (stack.length) {
    const next = stack.pop()!;
    count++;
    stack.push(...byId[next].childIds);
  }
  return count;
}

type OpenForm = { kind: 'reply' | 'edit'; id: string } | null;
type ArticleAction = 'reply' | 'edit' | 'delete' | 'vote' | 'toggleReplies';

/* ---------- component ---------- */

export default function NestedComments({ initialComments, currentUser, now = () => new Date() }: NestedCommentsProps) {
  const baseId = useId();
  const [thread, dispatch] = useReducer(threadReducer, initialComments, normalize);
  const [sort, setSort] = useState<CommentSort>('top');
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [openForm, setOpenForm] = useState<OpenForm>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const idCounter = useRef(0);

  const { byId, rootIds } = thread;

  // Sorted children for every parent, derived once per state/sort change.
  const sortedChildren = useMemo(() => {
    const compare = (a: string, b: string) => {
      const ea = byId[a];
      const eb = byId[b];
      if (sort === 'newest') return eb.createdAt.localeCompare(ea.createdAt);
      return eb.votes - ea.votes || ea.createdAt.localeCompare(eb.createdAt);
    };
    const map = new Map<string | null, string[]>();
    map.set(null, [...rootIds].sort(compare));
    for (const entry of Object.values(byId)) {
      if (entry.childIds.length) map.set(entry.id, [...entry.childIds].sort(compare));
    }
    return map;
  }, [byId, rootIds, sort]);

  const visibleCount = useMemo(() => Object.values(byId).filter((e) => !e.deleted).length, [byId]);

  // A form whose comment was deleted (or turned into a placeholder) is treated as closed.
  const activeForm = openForm && byId[openForm.id] && !byId[openForm.id].deleted ? openForm : null;

  const closeForm = useCallback(() => {
    setOpenForm(null);
    const opener = openerRef.current;
    openerRef.current = null;
    if (opener?.isConnected) opener.focus();
  }, []);

  const onArticleAction = useCallback((action: ArticleAction, id: string, opener: HTMLElement) => {
    switch (action) {
      case 'reply':
      case 'edit':
        openerRef.current = opener;
        setOpenForm({ kind: action, id });
        break;
      case 'delete':
        dispatch({ type: 'delete', id });
        break;
      case 'vote':
        dispatch({ type: 'toggleVote', id });
        break;
      case 'toggleReplies':
        setCollapsed((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        break;
    }
  }, []);

  const nextId = () => `${baseId}c${++idCounter.current}`;

  const addComment = (parentId: string | null, text: string) => {
    dispatch({ type: 'add', id: nextId(), parentId, author: currentUser, text, createdAt: now().toISOString() });
    if (parentId !== null) {
      setCollapsed((prev) => {
        if (!prev.has(parentId)) return prev;
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
  };

  const renderThread = (parentId: string | null): ReactNode => {
    const ids = sortedChildren.get(parentId) ?? [];
    return ids.map((id) => {
      const entry = byId[id];
      const hasReplies = entry.childIds.length > 0;
      const isCollapsed = hasReplies && collapsed.has(id);
      return (
        <li key={id} className={styles.node}>
          <CommentArticle
            entry={entry}
            isOwn={!entry.deleted && entry.author === currentUser}
            hasReplies={hasReplies}
            collapsed={isCollapsed}
            hiddenCount={isCollapsed ? countDescendants(byId, id) : 0}
            onAction={onArticleAction}
          />
          {activeForm?.id === id && (
            <InlineForm
              key={`${activeForm.kind}-${id}`}
              label={activeForm.kind === 'reply' ? `Reply to ${entry.author}` : 'Edit comment'}
              submitLabel={activeForm.kind === 'reply' ? 'Post reply' : 'Save'}
              initialValue={activeForm.kind === 'edit' ? entry.text : ''}
              onCancel={closeForm}
              onSubmit={(text) => {
                if (activeForm.kind === 'reply') addComment(id, text);
                else dispatch({ type: 'edit', id, text });
                closeForm();
              }}
            />
          )}
          {hasReplies && !isCollapsed && <ul className={styles.replies}>{renderThread(id)}</ul>}
        </li>
      );
    });
  };

  return (
    <section className={styles.comments} aria-labelledby={`${baseId}heading`}>
      <header className={styles.header}>
        <h2 id={`${baseId}heading`} className={styles.heading}>
          {plural(visibleCount, 'comment', 'comments')}
        </h2>
        <label className={styles.sort}>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value as CommentSort)}>
            <option value="top">Top</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </header>

      <Composer onPost={(text) => addComment(null, text)} />

      {rootIds.length === 0 ? (
        <p className={styles.empty}>No comments yet</p>
      ) : (
        <ul className={styles.thread}>{renderThread(null)}</ul>
      )}
    </section>
  );
}

/* ---------- pieces ---------- */

const CommentArticle = memo(function CommentArticle({
  entry,
  isOwn,
  hasReplies,
  collapsed,
  hiddenCount,
  onAction,
}: {
  entry: Entry;
  isOwn: boolean;
  hasReplies: boolean;
  collapsed: boolean;
  hiddenCount: number;
  onAction: (action: ArticleAction, id: string, opener: HTMLElement) => void;
}) {
  const act = (action: ArticleAction) => (e: { currentTarget: HTMLElement }) => onAction(action, entry.id, e.currentTarget);

  const toggle = hasReplies && (
    <button type="button" className={styles.link} aria-expanded={!collapsed} onClick={act('toggleReplies')}>
      {collapsed ? `Show ${plural(hiddenCount, 'reply', 'replies')}` : 'Hide replies'}
    </button>
  );

  if (entry.deleted) {
    return (
      <article className={`${styles.comment} ${styles.deleted}`} aria-label="Deleted comment">
        <p className={styles.text}>[deleted]</p>
        <div className={styles.actions}>{toggle}</div>
      </article>
    );
  }

  return (
    <article className={styles.comment} aria-label={`Comment by ${entry.author}`}>
      <div className={styles.meta}>
        <span className={styles.author}>{entry.author}</span>
        <time dateTime={entry.createdAt} className={styles.date}>
          {dateFormat.format(new Date(entry.createdAt))}
        </time>
        {entry.edited && <span className={styles.edited}>(edited)</span>}
      </div>
      <p className={styles.text}>{entry.text}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.vote} ${entry.upvoted ? styles.voted : ''}`}
          aria-pressed={entry.upvoted}
          onClick={act('vote')}
        >
          <span aria-hidden="true">▲ </span>Upvote
        </button>
        <span className={styles.votes}>{plural(entry.votes, 'vote', 'votes')}</span>
        <button type="button" className={styles.link} onClick={act('reply')}>
          Reply
        </button>
        {isOwn && (
          <>
            <button type="button" className={styles.link} onClick={act('edit')}>
              Edit
            </button>
            <button type="button" className={`${styles.link} ${styles.danger}`} onClick={act('delete')}>
              Delete
            </button>
          </>
        )}
        {toggle}
      </div>
    </article>
  );
});

function submitOnModEnter(event: KeyboardEvent<HTMLTextAreaElement>, submit: () => void) {
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    submit();
  }
}

function InlineForm({
  label,
  submitLabel,
  initialValue,
  onSubmit,
  onCancel,
}: {
  label: string;
  submitLabel: string;
  initialValue: string;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLTextAreaElement>(null);
  const blank = value.trim() === '';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const submit = () => {
    if (!blank) onSubmit(value.trim());
  };

  return (
    <form
      className={styles.inlineForm}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        ref={ref}
        aria-label={label}
        className={styles.textarea}
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          } else submitOnModEnter(e, submit);
        }}
      />
      <div className={styles.formActions}>
        <button type="submit" className={styles.primary} disabled={blank}>
          {submitLabel}
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function Composer({ onPost }: { onPost: (text: string) => void }) {
  const [value, setValue] = useState('');
  const blank = value.trim() === '';
  const submit = () => {
    if (blank) return;
    onPost(value.trim());
    setValue('');
  };
  return (
    <form
      className={styles.composer}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea
        aria-label="Add a comment"
        placeholder="What are your thoughts?"
        className={styles.textarea}
        rows={3}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => submitOnModEnter(e, submit)}
      />
      <div className={styles.formActions}>
        <button type="submit" className={styles.primary} disabled={blank}>
          Post comment
        </button>
      </div>
    </form>
  );
}
