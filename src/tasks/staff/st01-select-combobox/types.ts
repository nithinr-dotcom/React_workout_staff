import type { FC, ReactNode } from 'react';

/*
 * Minimal public contract. Tests and the Playground depend on everything here.
 * The API design is part of the exercise: add props/parts (size, invalid, asChild, onOpenChange, …)
 * as you see fit, but don't remove or rename what is below.
 */

export interface SelectRootProps {
  /** Controlled value. `null` means "nothing selected". When defined, the parent owns the value. */
  value?: string | null;
  /** Initial value for uncontrolled usage. Ignored when `value` is defined. */
  defaultValue?: string | null;
  /** Called with the new value whenever the user picks an enabled option (both modes). */
  onValueChange?: (value: string) => void;
  /** When set, the current value is submitted with the surrounding <form> under this name. */
  name?: string;
  /** Disables the whole control. */
  disabled?: boolean;
  children: ReactNode;
}

export interface SelectLabelProps {
  children: ReactNode;
}

export interface SelectTriggerProps {
  /** Text shown when no value is selected. */
  placeholder?: string;
  className?: string;
}

export interface SelectOptionsProps {
  children: ReactNode;
  className?: string;
}

export interface SelectOptionProps {
  value: string;
  disabled?: boolean;
  /** Text used for typeahead and for the trigger. Defaults to the text of `children` when it is a string. */
  textValue?: string;
  children: ReactNode;
}

export interface SelectComponent extends FC<SelectRootProps> {
  Label: FC<SelectLabelProps>;
  Trigger: FC<SelectTriggerProps>;
  Options: FC<SelectOptionsProps>;
  Option: FC<SelectOptionProps>;
}

export interface SelectModule {
  default: SelectComponent;
}
