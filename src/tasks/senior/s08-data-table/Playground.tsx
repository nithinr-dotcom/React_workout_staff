import { USERS, type User } from '../../../mocks/data/datasets';
import type { Column, DataTableComponent } from './types';

const columns: Column<User>[] = [
  { key: 'name', header: 'Name', sortable: true },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role', sortable: true },
  { key: 'department', header: 'Department', sortable: true },
  { key: 'age', header: 'Age', sortable: true },
  { key: 'joinedAt', header: 'Joined', sortable: true },
  {
    key: 'active',
    header: 'Status',
    sortable: true,
    render: (u) => (
      <span style={{ color: u.active ? '#027a48' : '#b42318', fontWeight: 600 }}>{u.active ? 'Active' : 'Inactive'}</span>
    ),
  },
];

export default function Playground({ impl }: { impl: { default: DataTableComponent } }) {
  const DataTable = impl.default;
  return (
    <div style={{ display: 'grid', gap: 32, maxWidth: 1000 }}>
      <section>
        <h3>120 users, role filter</h3>
        <DataTable
          caption="Team directory"
          columns={columns}
          rows={USERS}
          filter={{ key: 'role', label: 'Role' }}
          pageSizeOptions={[10, 25, 50]}
        />
      </section>
      <section>
        <h3>Empty rows</h3>
        <DataTable caption="Nobody here" columns={columns} rows={[] as User[]} />
      </section>
    </div>
  );
}
