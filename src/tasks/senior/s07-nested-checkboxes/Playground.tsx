import { useState, type ComponentType } from 'react';
import type { CheckboxNode, NestedCheckboxesProps } from './types';

const PERMISSIONS: CheckboxNode[] = [
  {
    id: 'payroll',
    label: 'Payroll',
    children: [
      { id: 'payroll.view', label: 'View payslips' },
      { id: 'payroll.run', label: 'Run payroll' },
      {
        id: 'payroll.tax',
        label: 'Tax settings',
        children: [
          { id: 'payroll.tax.view', label: 'View tax settings' },
          { id: 'payroll.tax.edit', label: 'Edit tax settings' },
        ],
      },
    ],
  },
  {
    id: 'people',
    label: 'People',
    children: [
      { id: 'people.directory', label: 'Directory' },
      { id: 'people.onboarding', label: 'Onboarding' },
      { id: 'people.offboarding', label: 'Offboarding' },
    ],
  },
  { id: 'devices', label: 'Devices', children: [] },
  { id: 'audit', label: 'Audit log' },
];

const INITIAL = ['payroll.view', 'people.directory'];

export default function Playground({ impl }: { impl: { default: ComponentType<NestedCheckboxesProps> } }) {
  const NestedCheckboxes = impl.default;
  const [selected, setSelected] = useState<string[]>(INITIAL);

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 560 }}>
      <section>
        <h3>Role permissions</h3>
        <NestedCheckboxes nodes={PERMISSIONS} defaultSelectedIds={INITIAL} onChange={setSelected} />
      </section>
      <section>
        <h3>onChange(selectedLeafIds)</h3>
        <pre style={{ fontSize: 13, background: '#f9fafb', padding: 8 }}>{JSON.stringify(selected, null, 2)}</pre>
      </section>
    </div>
  );
}
