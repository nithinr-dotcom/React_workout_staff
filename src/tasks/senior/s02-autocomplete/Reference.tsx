import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { searchCountries } from '../../../mocks/api';
import type { AutocompleteProps, FetchSuggestions, Suggestion } from './types';
import styles from './Reference.module.css';

type Status = 'idle' | 'loading' | 'success' | 'error';

const defaultFetchSuggestions: FetchSuggestions = async (query, { signal }) => {
  const countries = await searchCountries(query, { signal });
  return countries.map((c) => ({ id: c.code, label: c.name }));
};

/** Wraps the first case-insensitive occurrence of `query` in <mark>. No regex, so special characters are safe. */
function highlight(label: string, query: string): ReactNode {
  const q = query.trim();
  const at = q ? label.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (at === -1) return label;
  return (
    <>
      {label.slice(0, at)}
      <mark className={styles.mark}>{label.slice(at, at + q.length)}</mark>
      {label.slice(at + q.length)}
    </>
  );
}

export default function Autocomplete({
  label,
  placeholder,
  fetchSuggestions = defaultFetchSuggestions,
  onSelect,
  debounceMs = 300,
  minChars = 1,
}: AutocompleteProps) {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const [text, setText] = useState('');
  // The query the current results belong to (used for highlighting), not the live input text.
  const [resultsQuery, setResultsQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const cacheRef = useRef(new Map<string, Suggestion[]>());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  // Incremented whenever earlier responses become irrelevant. A response is applied only if its id is still current.
  const requestIdRef = useRef(0);
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the latest fetcher without restarting anything when the parent passes a new function each render.
  const fetchRef = useRef(fetchSuggestions);
  useLayoutEffect(() => {
    fetchRef.current = fetchSuggestions;
  });

  const cancelPending = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    controllerRef.current?.abort();
    controllerRef.current = null;
    requestIdRef.current++;
  };

  useEffect(() => cancelPending, []);

  const search = (raw: string) => {
    cancelPending();
    const query = raw.trim();
    setActiveIndex(-1);

    if (query.length < Math.max(1, minChars)) {
      setStatus('idle');
      setResults([]);
      setOpen(false);
      return;
    }

    const cached = cacheRef.current.get(query);
    if (cached) {
      setResults(cached);
      setResultsQuery(query);
      setStatus('success');
      setOpen(true);
      return;
    }

    const requestId = requestIdRef.current;
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus('loading');
    setOpen(true);

    fetchRef.current(query, { signal: controller.signal }).then(
      (items) => {
        if (requestId !== requestIdRef.current) return; // stale
        controllerRef.current = null;
        cacheRef.current.set(query, items);
        setResults(items);
        setResultsQuery(query);
        setStatus('success');
      },
      (error: unknown) => {
        if (requestId !== requestIdRef.current) return; // stale or aborted by us
        if ((error as { name?: string } | null)?.name === 'AbortError') return;
        controllerRef.current = null;
        setResults([]);
        setStatus('error');
      },
    );
  };

  const onInputChange = (value: string) => {
    setText(value);
    cancelPending();
    setActiveIndex(-1);
    if (value.trim().length < Math.max(1, minChars)) {
      // Nothing worth searching: close right away instead of waiting for the debounce.
      setOpen(false);
      setStatus('idle');
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      search(value);
    }, debounceMs);
  };

  const select = (suggestion: Suggestion) => {
    cancelPending();
    setText(suggestion.label);
    setOpen(false);
    setActiveIndex(-1);
    onSelect?.(suggestion);
  };

  const showList = open && results.length > 0;

  useEffect(() => {
    if (!showList || activeIndex < 0) return;
    listRef.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [showList, activeIndex]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const count = results.length;
    switch (event.key) {
      case 'ArrowDown': {
        if (count === 0) return;
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(0);
          return;
        }
        setActiveIndex((i) => (i + 1) % count);
        return;
      }
      case 'ArrowUp': {
        if (count === 0) return;
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setActiveIndex(count - 1);
          return;
        }
        setActiveIndex((i) => (i <= 0 ? count - 1 : i - 1));
        return;
      }
      case 'Enter': {
        if (showList && activeIndex >= 0 && results[activeIndex]) {
          event.preventDefault();
          select(results[activeIndex]);
        }
        return;
      }
      case 'Escape': {
        event.preventDefault();
        if (open) {
          setOpen(false);
          setActiveIndex(-1);
        } else {
          onInputChange('');
        }
        return;
      }
    }
  };

  const message =
    !open ? null : status === 'loading' ? 'Loading suggestions…' : status === 'success' && results.length === 0 ? 'No results' : null;

  return (
    <div className={styles.root}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.field}>
        <input
          id={inputId}
          className={styles.input}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listboxId}
          aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setOpen(false);
            setActiveIndex(-1);
          }}
        />

        <div className={styles.popup} hidden={!open}>
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-label={label}
            className={styles.listbox}
            hidden={!showList}
            // Keep focus in the input when clicking an option.
            onMouseDown={(e) => e.preventDefault()}
          >
            {results.map((s, index) => (
              // Options are never focused: the combobox input owns the keyboard (aria-activedescendant),
              // so a key handler on the option itself would be dead code.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <li
                key={s.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                className={`${styles.option} ${index === activeIndex ? styles.optionActive : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(s)}
              >
                {highlight(s.label, resultsQuery)}
              </li>
            ))}
          </ul>

          <div role="status" className={styles.message}>
            {message}
          </div>

          {open && status === 'error' && (
            <div role="alert" className={styles.error}>
              <span>Couldn't load suggestions</span>
              <button
                type="button"
                className={styles.retry}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => search(text)}
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
