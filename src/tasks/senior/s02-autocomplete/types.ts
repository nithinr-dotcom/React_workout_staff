export interface Suggestion {
  id: string;
  label: string;
}

export type FetchSuggestions = (query: string, options: { signal: AbortSignal }) => Promise<Suggestion[]>;

export interface AutocompleteProps {
  /** Visible label for the input. Also the combobox's accessible name. */
  label: string;
  placeholder?: string;
  /** Data source. Defaults to searching countries via `searchCountries` from the mock API. */
  fetchSuggestions?: FetchSuggestions;
  /** Called when the user picks a suggestion (Enter or click). */
  onSelect?: (suggestion: Suggestion) => void;
  /** Quiet period after the last keystroke before searching. Default 300. */
  debounceMs?: number;
  /** Minimum trimmed query length that triggers a search. Default 1. */
  minChars?: number;
}
