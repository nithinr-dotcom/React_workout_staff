import type { AutocompleteProps } from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export default function Autocomplete({
  label,
  placeholder,
  fetchSuggestions,
  onSelect,
  debounceMs = 300,
  minChars = 1,
}: AutocompleteProps) {
  // Your implementation here. Requirements are in README.md.
  // Tip: when `fetchSuggestions` is not passed, default to `searchCountries` from '../../../mocks/api'.
  void placeholder;
  void fetchSuggestions;
  void onSelect;
  void debounceMs;
  void minChars;
  return <div className={styles.root}>Autocomplete "{label}": start coding in Solution.tsx</div>;
}
