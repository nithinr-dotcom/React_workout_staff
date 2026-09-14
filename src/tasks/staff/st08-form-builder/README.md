# Schema-driven Form Builder

## Problem statement
An HR platform has hundreds of forms: onboarding, benefits, payroll and country-specific tax forms. Product teams want to ship a new form by writing a **schema**, not a component. Build `FormBuilder`, which renders a working, accessible form from a schema.

- Built-in field types: `text`, `number`, `checkbox`, `select` (static or async options), `group` (nested object) and `array` (repeatable items).
- **Dependent fields:** `visibleWhen` shows or hides a field based on other values. Hidden fields are not validated or submitted.
- **Validation:** `required` plus custom `validate` functions, which may be async (for example "is this username taken?"). They are debounced while the user types, and race-safe.
- **Extensibility:** a `fieldRegistry` lets a team add a custom type (a phone input, a date picker) without forking the builder.

This is a staff round, so the schema and extension API are part of the exercise. `types.ts` is the minimal contract the tests rely on. Extend it (declarative conditions, help text, `disabled`, layout), but keep what is there working.

## Clarifying questions to ask
- When do errors appear? *(After a field is blurred for the first time, or after the first submit attempt. Never on initial render.)*
- What does `visibleWhen` receive? *(The whole form's values, so a nested field can depend on a top-level field.)*
- When a field becomes hidden, is its value discarded? *(It is excluded from validation and from the submitted payload. Whether the value is remembered if the field reappears is your call. Explain your choice.)*
- How are values shaped? *(`text` → string (default `''`); `number` → number, or `undefined` when empty; `checkbox` → boolean (default `false`); `select` → string (default `''`); `group` → object of its fields; `array` → array of objects, one per item (default `[]`); custom types → whatever the renderer passes to `onChange` (default `undefined`).)*
- What counts as empty for `required`? *(`undefined`, `null`, `false`, a whitespace-only string, or an empty array.)*
- Is validation sync or async? *(`validate` may return a string, `undefined` or a Promise of either. The builder can't know in advance, so validation triggered by typing is debounced by 300 ms. Blur and submit validate immediately.)*
- Who renders the label and error for custom field types? *(The builder renders the `<label htmlFor={inputId}>` and the error element with `id={errorId}`. The custom renderer renders the control.)*

## Functional requirements
- [ ] Render fields in schema order. Every non-group, non-array field has a `<label>` associated with its control.
- [ ] `initialValues` override `defaultValue`, which overrides the type default.
- [ ] `text`, `number`, `checkbox` and `select` render native controls. `number` values are submitted as numbers.
- [ ] `select` with `options` renders them after an empty placeholder option.
- [ ] `select` with `optionsFrom` calls it once when the field first renders, passing `{ values, signal }`. The control is `disabled` until the options arrive. If loading fails, show an error message on the field.
- [ ] `group` renders a `<fieldset>` whose `<legend>` is the label. Its fields' values nest under `name`.
- [ ] `array` renders a `<fieldset>` with legend `label` and:
  - one `<fieldset>` per item with legend `"<label> <n>"` (1-based), containing the item's `fields`;
  - a button `"Remove <label> <n>"` per item;
  - a button `"Add <label>"` that appends an item built from the fields' defaults.
- [ ] Removing an item re-numbers the remaining items and keeps their values.
- [ ] `visibleWhen(values)` returning `false` removes the field from the DOM, from validation and from the submitted payload. For a `group` or `array`, this applies to everything inside it.
- [ ] A `required` field with an empty value has the error `"<label> is required"`. `validate` runs only when the required check passes, and its message is the error.
- [ ] Validation triggered by typing is debounced by 300 ms per field. A result for an outdated value is ignored.
- [ ] Errors show after the field was blurred once, or after a submit attempt.
- [ ] A button named `Submit`:
  - validates every visible field, awaiting async validators;
  - if any field fails, shows the errors, moves focus to the first invalid field in schema order, and does **not** call `onSubmit`;
  - otherwise calls `onSubmit(values)` with only the visible fields.
- [ ] `fieldRegistry[type]` renders any field whose `type` matches, including overrides of built-in types. It receives `FieldRendererProps`.

## Non-functional requirements
- **Accessibility** (see the [WAI forms tutorial](https://www.w3.org/WAI/tutorials/forms/)):
  - The accessible name of every control is exactly its `label`. A visual required marker must be `aria-hidden` or added with CSS. Mark the control with `required` or `aria-required`.
  - An invalid control has `aria-invalid="true"` and `aria-describedby` pointing at the element that contains its error message.
  - Groups and arrays use `fieldset` / `legend`.
  - Focus moves to the first invalid field on a failed submit. Consider an `aria-live` summary for screen-reader users.
  - Adding an array item should move focus into it (nice to have).
- **Keyboard:** all native behaviour. No custom key handling is required.

  | Key | Behaviour |
  |---|---|
  | `Tab` / `Shift+Tab` | Move between controls in schema order |
  | `Enter` in a text input | Submits the form (native) |
  | `Space` | Toggles a checkbox, activates a button |
- **Performance:** typing in one field of a 200-field form must not re-render every field. Explain how your state shape and component boundaries achieve this, even if the base version doesn't fully do it.
- **UX states:** the async options loading state, a pending indicator while an async validator runs (nice to have), and a submit button that is disabled or shows it is busy while `onSubmit`'s promise is pending.

## Constraints
- 120 minutes. React and CSS Modules only. No form libraries (`react-hook-form`, `formik`) or schema libraries (`zod`, `ajv`).
- The Playground uses `getCountries` (async options) and `getAllUsers` (async "email taken" check) from `src/mocks/api.ts`. Tests inject their own `optionsFrom` and `validate` functions.
- Default-export the component from `Solution.tsx`.

## Data / API contract
```ts
type FormValues = Record<string, unknown>;
interface SelectOption { label: string; value: string }
type Validator = (value: unknown, values: FormValues) => string | undefined | Promise<string | undefined>;
type BuiltInFieldType = 'text' | 'number' | 'select' | 'checkbox' | 'group' | 'array';

interface FieldSchema {
  name: string;
  type: BuiltInFieldType | (string & {});
  label: string;
  required?: boolean;
  validate?: Validator;
  visibleWhen?: (values: FormValues) => boolean;
  defaultValue?: unknown;
  options?: SelectOption[];                                   // select
  optionsFrom?: (context: { values: FormValues; signal: AbortSignal }) => Promise<SelectOption[]>; // select
  fields?: FieldSchema[];                                     // group | array
  props?: Record<string, unknown>;                            // custom renderers
}
interface FormSchema { fields: FieldSchema[] }

interface FieldRendererProps {
  field: FieldSchema;
  inputId: string;
  labelId: string;
  errorId: string;
  value: unknown;
  onChange: (value: unknown) => void;
  onBlur: () => void;
  error?: string;
}
type FieldRegistry = Record<string, ComponentType<FieldRendererProps>>;

interface FormBuilderProps {
  schema: FormSchema;
  onSubmit: (values: FormValues) => void | Promise<void>;
  fieldRegistry?: FieldRegistry;
  initialValues?: FormValues;
}
```

## Test contract
- **Roles and names:**
  - `text` → `textbox`, `number` → `spinbutton`, `checkbox` → `checkbox`, `select` → `combobox`. Each is named exactly by its `label`.
  - The submit button is named `Submit`.
- **Groups:**
  - a `group` is a `group` role named by its label;
  - array items are `group`s named `"<label> <n>"`;
  - the buttons are named `"Add <label>"` and `"Remove <label> <n>"`.
- **Errors:**
  - required error text is exactly `"<label> is required"`;
  - custom messages are exactly what `validate` returns;
  - the invalid control has `aria-invalid="true"` and an accessible description equal to the message;
  - no error text is present on initial render.
- **Submit:** `onSubmit` is called once, with values equal (`toEqual`) to the visible fields' values. Hidden field keys must be absent. Tests wait with `waitFor`.
- **Async validation:** tests type a value, press `Tab`, then wait up to 1s for the message. The validator must be called fewer times than the number of characters typed.
- **Async options:** the `combobox` is disabled before `optionsFrom` resolves and enabled after. Options are `option` roles named by their labels.
- **Custom renderers:** the test's renderer uses `inputId` as the input's `id` and relies on the builder's `<label>`.

## Edge cases
- `visibleWhen` depends on a field that is itself hidden.
- An async validator resolves after the user has changed the value again (out-of-order responses).
- Submit clicked twice quickly while `onSubmit` is pending.
- A select's current value is not among the options that were loaded.
- An array item removed while its async validator is running.
- Duplicate `name`s among siblings in the schema. Validate the schema in development?
- Schema changes at runtime, for example a server-driven schema that updates after a feature flag loads.

## Follow-ups
1. **Declarative conditions.** Replace or augment `visibleWhen` functions with a JSON-serialisable rule language (`{ field: 'country', op: 'eq', value: 'US' }`, `and` / `or`). The schema can then be stored server-side. Where does evaluation live, and how do you type it?
2. **Dependent options.** Add `dependsOn: ['country']` to `optionsFrom` fields. Reload the options when those values change, cancel stale requests, and clear an invalid selection.
3. **Performance at 500 fields.** Re-architect state so a keystroke re-renders only the edited field: a field-level subscription store, `useSyncExternalStore`, or uncontrolled inputs with refs. Measure with the React Profiler before and after.
4. **Cross-field validation.** Add form-level validators (`password === confirm`, the sum of percentages is 100) and decide which field the error attaches to.
5. **Drafts and multi-step.** Persist in-progress values to `localStorage` with versioned migrations when the schema changes, and split long schemas into steps with per-step validation.

## Concepts covered
Recursive schema rendering · value paths for nested and array state · derived visibility · debounced, race-safe async validation · registries and inversion of control for extensibility · accessible error association · focus management.

Related: J05 Signup form · ST09 Feature Flags (server-driven configuration) · ST12 Plugin Architecture (registries).

## Design discussion prompts
- Functions in the schema (`validate`, `visibleWhen`) versus a serialisable DSL: what do you gain and lose? Which would you pick if schemas are authored by a non-engineering ops team?
- Where does form state live, and what is its shape: nested objects, or a flat map keyed by path? How does that choice affect arrays, re-renders and dirty tracking?
- How do you guarantee an old async validation result never overwrites a newer one? How would you show "checking…" without flicker?
- A team registers a custom `date` field. What contract must their component meet for accessibility and validation to keep working, and how would you enforce it (types, dev warnings, tests)?
- Controlled versus uncontrolled inputs at 500 fields: what did you measure, and which way would you go?
- How would you version schemas stored on the server so old saved drafts still load after a field is renamed?
- What would you unit test (pure schema → values → payload functions) versus integration test (the rendered form)?
- How would you roll this out to replace 50 hand-written forms? Which metrics show the migration is succeeding?
