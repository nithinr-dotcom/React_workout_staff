import type {
  SelectComponent,
  SelectLabelProps,
  SelectOptionProps,
  SelectOptionsProps,
  SelectRootProps,
  SelectTriggerProps,
} from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

function SelectRoot({ value, defaultValue, onValueChange, name, disabled, children }: SelectRootProps) {
  // Your implementation here. Requirements are in README.md.
  void value;
  void defaultValue;
  void onValueChange;
  void name;
  void disabled;
  void children;
  return <div className={styles.root}>Select: start coding in Solution.tsx</div>;
}

function Label({ children }: SelectLabelProps) {
  void children;
  return null;
}

function Trigger({ placeholder, className }: SelectTriggerProps) {
  void placeholder;
  void className;
  return null;
}

function Options({ children, className }: SelectOptionsProps) {
  void children;
  void className;
  return null;
}

function Option({ value, disabled, textValue, children }: SelectOptionProps) {
  void value;
  void disabled;
  void textValue;
  void children;
  return null;
}

const Select: SelectComponent = Object.assign(SelectRoot, { Label, Trigger, Options, Option });

export default Select;
