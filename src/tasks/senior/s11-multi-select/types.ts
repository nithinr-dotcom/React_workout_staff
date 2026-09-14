export interface MultiSelectOption {
  /** Unique, stable identifier. */
  value: string;
  /** Visible text. Also the option's accessible name. */
  label: string;
}

export interface MultiSelectProps {
  /** Visible label. Names both the combobox input and the listbox. */
  label: string;
  options: MultiSelectOption[];
  /** Selected values, in the order they were selected. Controlled. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Placeholder for the filter input. */
  placeholder?: string;
}
