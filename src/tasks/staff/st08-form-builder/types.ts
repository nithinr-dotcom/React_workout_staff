import type { ComponentType } from 'react';

/*
 * Minimal public contract. The tests and Playground depend on these names and shapes.
 * Extending the schema is part of the exercise (for example declarative conditions, field-level
 * `disabled`, help text or layout hints). Keep what is here working.
 */

export type FormValues = Record<string, unknown>;

export interface SelectOption {
  label: string;
  value: string;
}

/** Return an error message, or undefined when the value is valid. May be async. */
export type Validator = (value: unknown, values: FormValues) => string | undefined | Promise<string | undefined>;

export type BuiltInFieldType = 'text' | 'number' | 'select' | 'checkbox' | 'group' | 'array';

export interface FieldSchema {
  /** Key in the values object. Unique among siblings. */
  name: string;
  /** Built-in type, or a key registered in `fieldRegistry`. */
  type: BuiltInFieldType | (string & {});
  /** Visible label and accessible name. */
  label: string;
  /** Empty value → error "<label> is required". */
  required?: boolean;
  /** Runs after the required check passes. Async validators are debounced while typing. */
  validate?: Validator;
  /**
   * Receives the values of the form. The field (and its value) is dropped from the
   * rendered form, from validation and from the submitted payload while this returns false.
   */
  visibleWhen?: (values: FormValues) => boolean;
  /** Starting value when `initialValues` doesn't provide one. */
  defaultValue?: unknown;
  /** select: static options. */
  options?: SelectOption[];
  /** select: loads options asynchronously when the field first renders. */
  optionsFrom?: (context: { values: FormValues; signal: AbortSignal }) => Promise<SelectOption[]>;
  /** group: nested fields, whose values become an object. array: the fields of each item. */
  fields?: FieldSchema[];
  /** Extra props for custom field renderers. */
  props?: Record<string, unknown>;
}

export interface FormSchema {
  fields: FieldSchema[];
}

/** Props given to a custom field renderer registered in `fieldRegistry`. */
export interface FieldRendererProps {
  field: FieldSchema;
  /** Use as the id of the focusable control. The builder renders `<label htmlFor={inputId}>`. */
  inputId: string;
  /** Id of the builder's label element, for controls that need `aria-labelledby`. */
  labelId: string;
  /** Id of the element the builder renders the error message in. Point `aria-describedby` at it while `error` is set. */
  errorId: string;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  /** Error message, present only once the field should show it. */
  error?: string;
}

export type FieldRegistry = Record<string, ComponentType<FieldRendererProps>>;

export interface FormBuilderProps {
  schema: FormSchema;
  /** Called with the values of visible fields only, after every validator passed. */
  onSubmit: (values: FormValues) => void | Promise<void>;
  /** Custom field types (or overrides of built-in ones), keyed by `type`. */
  fieldRegistry?: FieldRegistry;
  initialValues?: FormValues;
}
