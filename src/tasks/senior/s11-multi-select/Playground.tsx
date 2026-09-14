import { useState, type ComponentType } from 'react';
import { COUNTRIES } from '../../../mocks/data/datasets';
import type { MultiSelectOption, MultiSelectProps } from './types';

const SKILLS: MultiSelectOption[] = [
  { value: 'react', label: 'React' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'css', label: 'CSS' },
  { value: 'a11y', label: 'Accessibility' },
  { value: 'testing', label: 'Testing' },
  { value: 'perf', label: 'Web Performance' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'node', label: 'Node.js' },
];

const COUNTRY_OPTIONS: MultiSelectOption[] = COUNTRIES.map((c) => ({ value: c.code, label: c.name }));

export default function Playground({ impl }: { impl: { default: ComponentType<MultiSelectProps> } }) {
  const MultiSelect = impl.default;
  const [skills, setSkills] = useState<string[]>(['react']);
  const [countries, setCountries] = useState<string[]>([]);
  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 480 }}>
      <section>
        <h3>Skills (8 options, one preselected)</h3>
        <MultiSelect label="Skills" options={SKILLS} value={skills} onChange={setSkills} placeholder="Filter skills…" />
        <p>
          value: <code>{JSON.stringify(skills)}</code>
        </p>
      </section>
      <section>
        <h3>Countries ({COUNTRY_OPTIONS.length} options)</h3>
        <MultiSelect
          label="Shipping countries"
          options={COUNTRY_OPTIONS}
          value={countries}
          onChange={setCountries}
          placeholder="Type to filter…"
        />
        <p>
          value: <code>{JSON.stringify(countries)}</code>
        </p>
      </section>
      <p>Below the fold: click here to test click-outside.</p>
    </div>
  );
}
