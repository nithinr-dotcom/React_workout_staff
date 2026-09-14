// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { FieldRendererProps, FormSchema, SelectOption } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const FormBuilder = impl.default;

const submitButton = () => screen.getByRole('button', { name: 'Submit' });

const basicSchema: FormSchema = {
  fields: [
    { name: 'name', type: 'text', label: 'Name', required: true },
    { name: 'age', type: 'number', label: 'Age' },
    { name: 'newsletter', type: 'checkbox', label: 'Subscribe to newsletter' },
    {
      name: 'role',
      type: 'select',
      label: 'Role',
      options: [
        { label: 'Engineer', value: 'eng' },
        { label: 'Designer', value: 'design' },
      ],
    },
  ],
};

describeTask('Schema-driven Form Builder', () => {
  it('renders a labelled control per field, applies initialValues, and shows no errors initially', () => {
    render(<FormBuilder schema={basicSchema} onSubmit={vi.fn()} initialValues={{ name: 'Grace' }} />);
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Grace');
    expect(screen.getByRole('spinbutton', { name: 'Age' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Subscribe to newsletter' })).not.toBeChecked();
    expect(screen.getByRole('combobox', { name: 'Role' })).toBeInTheDocument();
    expect(submitButton()).toBeInTheDocument();
    expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
  });

  it('blocks submit on required errors, wires the message to the field, and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormBuilder schema={basicSchema} onSubmit={onSubmit} />);
    await user.click(submitButton());

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    const name = screen.getByRole('textbox', { name: 'Name' });
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Name is required');
    await waitFor(() => expect(name).toHaveFocus());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits typed values: numbers as numbers, checkboxes as booleans', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FormBuilder schema={basicSchema} onSubmit={onSubmit} />);
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Ada');
    await user.type(screen.getByRole('spinbutton', { name: 'Age' }), '36');
    await user.click(screen.getByRole('checkbox', { name: 'Subscribe to newsletter' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Role' }), 'design');
    await user.click(submitButton());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada', age: 36, newsletter: true, role: 'design' });
  });

  it('shows fields only when visibleWhen passes, and leaves hidden fields out of validation and the payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const schema: FormSchema = {
      fields: [
        { name: 'hasCompany', type: 'checkbox', label: 'I work at a company' },
        {
          name: 'company',
          type: 'text',
          label: 'Company',
          required: true,
          visibleWhen: (values) => values.hasCompany === true,
        },
      ],
    };
    render(<FormBuilder schema={schema} onSubmit={onSubmit} />);
    expect(screen.queryByRole('textbox', { name: 'Company' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: 'I work at a company' }));
    await user.type(screen.getByRole('textbox', { name: 'Company' }), 'Acme');
    await user.click(screen.getByRole('checkbox', { name: 'I work at a company' }));
    expect(screen.queryByRole('textbox', { name: 'Company' })).not.toBeInTheDocument();

    await user.click(submitButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload).toEqual({ hasCompany: false });
    expect('company' in payload).toBe(false);
  });

  it('nests group values and supports adding and removing array items', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const schema: FormSchema = {
      fields: [
        { name: 'address', type: 'group', label: 'Address', fields: [{ name: 'city', type: 'text', label: 'City' }] },
        { name: 'phones', type: 'array', label: 'Phones', fields: [{ name: 'number', type: 'text', label: 'Number' }] },
      ],
    };
    render(<FormBuilder schema={schema} onSubmit={onSubmit} />);
    await user.type(within(screen.getByRole('group', { name: 'Address' })).getByRole('textbox', { name: 'City' }), 'Paris');

    await user.click(screen.getByRole('button', { name: 'Add Phones' }));
    await user.click(screen.getByRole('button', { name: 'Add Phones' }));
    await user.type(within(screen.getByRole('group', { name: 'Phones 1' })).getByRole('textbox', { name: 'Number' }), '111');
    await user.type(within(screen.getByRole('group', { name: 'Phones 2' })).getByRole('textbox', { name: 'Number' }), '222');

    await user.click(screen.getByRole('button', { name: 'Remove Phones 1' }));
    expect(screen.queryByRole('group', { name: 'Phones 2' })).not.toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Phones 1' })).getByRole('textbox', { name: 'Number' })).toHaveValue(
      '222',
    );

    await user.click(submitButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith({ address: { city: 'Paris' }, phones: [{ number: '222' }] });
  });

  it('runs debounced async validation after blur and blocks submit until it passes', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const validate = vi.fn(async (value: unknown) => (value === 'taken' ? 'Username is taken' : undefined));
    const schema: FormSchema = { fields: [{ name: 'username', type: 'text', label: 'Username', validate }] };
    render(<FormBuilder schema={schema} onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox', { name: 'Username' });
    await user.type(input, 'taken');
    await user.tab();
    expect(await screen.findByText('Username is taken')).toBeInTheDocument();
    expect(validate.mock.calls.length).toBeLessThan(5); // not once per keystroke

    await user.click(submitButton());
    expect(onSubmit).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, 'free');
    await waitFor(() => expect(screen.queryByText('Username is taken')).not.toBeInTheDocument());
    await user.click(submitButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ username: 'free' }));
  });

  it('loads select options with optionsFrom, keeping the select disabled until they arrive', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    let resolve!: (options: SelectOption[]) => void;
    const optionsFrom = vi.fn(() => new Promise<SelectOption[]>((r) => (resolve = r)));
    const schema: FormSchema = { fields: [{ name: 'country', type: 'select', label: 'Country', optionsFrom }] };
    render(<FormBuilder schema={schema} onSubmit={onSubmit} />);

    expect(screen.getByRole('combobox', { name: 'Country' })).toBeDisabled();
    await waitFor(() => expect(optionsFrom).toHaveBeenCalled());
    resolve([
      { label: 'Canada', value: 'CA' },
      { label: 'India', value: 'IN' },
    ]);
    expect(await screen.findByRole('option', { name: 'India' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Country' })).toBeEnabled();

    await user.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'IN');
    await user.click(submitButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ country: 'IN' }));
  });

  it('renders custom field types from fieldRegistry with builder-provided label and value wiring', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    function SlugInput({ inputId, errorId, value, onChange, onBlur, error }: FieldRendererProps) {
      return (
        <input
          id={inputId}
          aria-describedby={error ? errorId : undefined}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
          onBlur={onBlur}
        />
      );
    }
    const schema: FormSchema = { fields: [{ name: 'slug', type: 'slug', label: 'Slug', required: true }] };
    render(<FormBuilder schema={schema} onSubmit={onSubmit} fieldRegistry={{ slug: SlugInput }} />);

    await user.click(submitButton());
    expect(await screen.findByText('Slug is required')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Slug' }), 'Hello World');
    expect(screen.getByRole('textbox', { name: 'Slug' })).toHaveValue('hello-world');
    await user.click(submitButton());
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ slug: 'hello-world' }));
  });
});
