import { Component, useState, type FormEvent, type ReactNode } from 'react';
import type { SelectModule } from './types';

class DemoBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <p style={{ color: '#b91c1c' }}>Error: {this.state.error.message}</p> : this.props.children;
  }
}

const COUNTRIES = ['Argentina', 'Australia', 'Austria', 'Belgium', 'Brazil', 'Canada', 'Chile', 'Denmark', 'Finland', 'France'];

export default function Playground({ impl }: { impl: SelectModule }) {
  const Select = impl.default;
  const [controlled, setControlled] = useState<string | null>('medium');
  const [submitted, setSubmitted] = useState<string>('');

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))));
  };

  return (
    <div style={{ display: 'grid', gap: 28, maxWidth: 420, fontFamily: 'system-ui' }}>
      <section>
        <h3>Uncontrolled in a form (with a disabled option)</h3>
        <DemoBoundary>
          <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
            <Select name="fruit" defaultValue="banana">
              <Select.Label>Fruit</Select.Label>
              <Select.Trigger placeholder="Pick a fruit" />
              <Select.Options>
                <Select.Option value="apple">Apple</Select.Option>
                <Select.Option value="banana">Banana</Select.Option>
                <Select.Option value="blackberry">Blackberry</Select.Option>
                <Select.Option value="blueberry">Blueberry</Select.Option>
                <Select.Option value="durian" disabled>
                  Durian (out of stock)
                </Select.Option>
              </Select.Options>
            </Select>
            <button type="submit">Submit</button>
            {submitted && <code>FormData: {submitted}</code>}
          </form>
        </DemoBoundary>
      </section>

      <section>
        <h3>Controlled</h3>
        <DemoBoundary>
          <Select value={controlled} onValueChange={setControlled}>
            <Select.Label>Size</Select.Label>
            <Select.Trigger placeholder="Choose a size" />
            <Select.Options>
              <Select.Option value="small">Small</Select.Option>
              <Select.Option value="medium">Medium</Select.Option>
              <Select.Option value="large">Large</Select.Option>
            </Select.Options>
          </Select>
          <p>
            value = <code>{String(controlled)}</code>{' '}
            <button type="button" onClick={() => setControlled(null)}>
              Clear from parent
            </button>
          </p>
        </DemoBoundary>
      </section>

      <section>
        <h3>Nested wrappers + typeahead (try typing “b”, “ch”, “fi”)</h3>
        <DemoBoundary>
          <Select>
            <Select.Label>Country</Select.Label>
            <Select.Trigger placeholder="Select a country" />
            <Select.Options>
              {COUNTRIES.map((c) => (
                <div key={c}>
                  <Select.Option value={c.toLowerCase()} textValue={c}>
                    <span aria-hidden="true">🌍 </span>
                    {c}
                  </Select.Option>
                </div>
              ))}
            </Select.Options>
          </Select>
        </DemoBoundary>
      </section>

      <section>
        <h3>Disabled</h3>
        <DemoBoundary>
          <Select disabled defaultValue="x">
            <Select.Label>Locked</Select.Label>
            <Select.Trigger />
            <Select.Options>
              <Select.Option value="x">Cannot change</Select.Option>
            </Select.Options>
          </Select>
        </DemoBoundary>
      </section>
    </div>
  );
}
