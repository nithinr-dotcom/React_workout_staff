import type { DictionarySearchProps, WordResult } from "./types";
import styles from "./Solution.module.css";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ApiError, lookupWord } from "../../../mocks/api";

// 1. STATE MACHINE: one state value instead of isLoading / error / data flags.
//    Impossible combos (loading AND an old result AND an error) can't exist.
type State =
  | { type: "idle" }
  | { type: "blank" }
  | { type: "loading" }
  | { type: "success"; result: WordResult }
  | { type: "notFound"; word: string }
  | { type: "error"; word: string };

export default function DictionarySearch({ searchAsYouTypeMs }: DictionarySearchProps) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ type: "idle" });

  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  // 2. REFS for things that must not trigger a render:
  //    - the AbortController of the request in flight (to cancel it),
  //    - the pending search-as-you-type timer.
  const controllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 3. CLEANUP on unmount: cancel the request and the timer, so nothing
  //    calls setState on an unmounted component.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Cancel whatever is running: the debounce timer and the request.
  const cancelPending = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    controllerRef.current?.abort();
    controllerRef.current = null;
  };

  const runSearch = async (word: string) => {
    // 4. RACE CONDITIONS: abort the previous request before starting a new one.
    //    Each search gets its OWN controller, and later we only update the UI if
    //    that controller is still the current one. So a slow old response (or
    //    its AbortError) that arrives late is simply ignored.
    cancelPending();

    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ type: "loading" }); // replaces any old result or error

    try {
      const result = await lookupWord(word, { signal: controller.signal });
      if (controllerRef.current !== controller) return; // stale
      setState({ type: "success", result });
    } catch (err) {
      // Aborted or stale: never show an error for it.
      if (controllerRef.current !== controller) return;
      // A 404 is a normal "empty" answer, not a failure.
      if (err instanceof ApiError && err.status === 404) setState({ type: "notFound", word });
      else setState({ type: "error", word });
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // no full-page reload
    // Clicking the button moves focus to it; put it back so the user can keep typing.
    inputRef.current?.focus();
    const word = query.trim();
    if (!word) {
      cancelPending(); // a late response must not replace the hint
      setState({ type: "blank" });
      return;
    }
    void runSearch(word);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setQuery(next);
    if (searchAsYouTypeMs === undefined) return;

    // 5. SEARCH AS YOU TYPE (follow-up 1): restart the timer on every key, so
    //    we only search once the user pauses. The timer lives in a ref, set
    //    from the event handler (not an effect), because typing is the cause.
    if (timerRef.current) clearTimeout(timerRef.current);
    const word = next.trim();
    if (!word) {
      cancelPending();
      setState({ type: "idle" });
      return;
    }
    timerRef.current = setTimeout(() => void runSearch(word), searchAsYouTypeMs);
  };

  return (
    <div className={styles.root}>
      <form className={styles.form} onSubmit={handleSubmit} role="search">
        <label htmlFor={inputId} className={styles.label}>
          Word
        </label>
        <div className={styles.row}>
          <input
            ref={inputRef}
            id={inputId}
            type="text"
            value={query}
            onChange={handleChange}
            autoComplete="off"
            spellCheck={false}
            className={styles.input}
          />
          <button type="submit" className={styles.button}>
            Search
          </button>
        </div>
      </form>

      {/* 6. LIVE REGION: always rendered, so screen readers announce when its
          text changes ("Loading…", "No definitions found…"). The generic error
          is NOT in here: it has its own role="alert", which interrupts. */}
      <p role="status" className={`${styles.message} ${state.type === "loading" ? styles.loading : ""}`}>
        {state.type === "idle" && "Search for a word to see its definition."}
        {state.type === "blank" && "Please enter a word."}
        {state.type === "loading" && "Loading…"}
        {state.type === "notFound" && `No definitions found for "${state.word}".`}
      </p>

      {state.type === "success" && (
        <section className={styles.result}>
          <h2 className={styles.word}>{state.result.word}</h2>
          <ol className={styles.meanings}>
            {/* 7. KEYS: a word can have two "noun" meanings, so partOfSpeech alone
                is not unique. The list is static per result, so the index is safe here. */}
            {state.result.meanings.map((m, i) => (
              <li key={`${m.partOfSpeech}-${i}`} className={styles.meaning}>
                <span className={styles.pos}>{m.partOfSpeech}</span> {m.definition}
              </li>
            ))}
          </ol>
        </section>
      )}

      {state.type === "error" && (
        <div role="alert" className={styles.error}>
          <p>Something went wrong. Please try again.</p>
          <button type="button" className={styles.button} onClick={() => void runSearch(state.word)}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
