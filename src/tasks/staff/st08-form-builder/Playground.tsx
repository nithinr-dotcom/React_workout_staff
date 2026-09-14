import { Component, useState, type ComponentType, type ReactNode } from 'react';
import { getAllUsers, getCountries } from '../../../mocks/api';
import { USERS } from '../../../mocks/data/datasets';
import type { FieldRendererProps, FormBuilderProps, FormSchema, FormValues } from './types';

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <p style={{ color: '#b91c1c' }}>Error: {this.state.error.message}</p>;
    return this.props.children;
  }
}

/** A custom field type: 1–5 rating rendered as a radio group. */
function RatingField({ field, labelId, errorId, value, onChange, onBlur, error }: FieldRendererProps) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
      style={{ display: 'flex', gap: 8 }}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n}>
          <input
            type="radio"
            name={field.name}
            checked={value === n}
            onChange={() => onChange(n)}
            onBlur={onBlur}
          />{' '}
          {n}
        </label>
      ))}
    </div>
  );
}

const onboardingSchema: FormSchema = {
  fields: [
    { name: 'fullName', type: 'text', label: 'Full name', required: true },
    {
      name: 'email',
      type: 'text',
      label: 'Work email',
      required: true,
      validate: async (value) => {
        const email = String(value).trim().toLowerCase();
        if (!email.includes('@')) return 'Enter a valid email address';
        const users = await getAllUsers({ latency: 400 });
        return users.some((u) => u.email === email) ? 'This email is already registered' : undefined;
      },
    },
    { name: 'age', type: 'number', label: 'Age', validate: (v) => (v !== undefined && Number(v) < 18 ? 'Must be 18 or older' : undefined) },
    {
      name: 'country',
      type: 'select',
      label: 'Country',
      required: true,
      optionsFrom: async ({ signal }) =>
        (await getCountries({ signal })).map((c) => ({ label: c.name, value: c.code })),
    },
    {
      name: 'taxId',
      type: 'text',
      label: 'SSN (last 4 digits)',
      required: true,
      visibleWhen: (values) => values.country === 'US',
      validate: (v) => (/^\d{4}$/.test(String(v)) ? undefined : 'Enter exactly 4 digits'),
    },
    {
      name: 'role',
      type: 'select',
      label: 'Role',
      options: [
        { label: 'Engineer', value: 'eng' },
        { label: 'Designer', value: 'design' },
        { label: 'Manager', value: 'manager' },
      ],
    },
    { name: 'hasLaptop', type: 'checkbox', label: 'I need a laptop' },
    {
      name: 'shipping',
      type: 'group',
      label: 'Laptop shipping address',
      visibleWhen: (values) => values.hasLaptop === true,
      fields: [
        { name: 'street', type: 'text', label: 'Street', required: true },
        { name: 'city', type: 'text', label: 'City', required: true },
      ],
    },
    {
      name: 'emergencyContacts',
      type: 'array',
      label: 'Emergency contact',
      fields: [
        { name: 'name', type: 'text', label: 'Contact name', required: true },
        { name: 'phone', type: 'text', label: 'Phone', required: true },
      ],
    },
    { name: 'experience', type: 'rating', label: 'How was onboarding so far?' },
  ],
};

export default function Playground({ impl }: { impl: { default: ComponentType<FormBuilderProps> } }) {
  const FormBuilder = impl.default;
  const [submitted, setSubmitted] = useState<FormValues | null>(null);

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 16, maxWidth: 560 }}>
      <p style={{ fontSize: 13, color: '#667085' }}>
        Try: choose United States (the SSN field appears), tick "I need a laptop", add emergency contacts, and enter{' '}
        <code>{USERS[0].email}</code> as the work email to see async validation fail.
      </p>
      <Boundary>
        <FormBuilder
          schema={onboardingSchema}
          fieldRegistry={{ rating: RatingField }}
          initialValues={{ role: 'eng' }}
          onSubmit={async (values) => {
            await new Promise((r) => setTimeout(r, 500));
            setSubmitted(values);
          }}
        />
      </Boundary>
      {submitted && (
        <section aria-live="polite">
          <h3>Submitted payload</h3>
          <pre style={{ background: '#f2f4f7', padding: 12, fontSize: 13 }}>{JSON.stringify(submitted, null, 2)}</pre>
        </section>
      )}
    </div>
  );
}
