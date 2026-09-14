import type { ComponentType } from 'react';
import type { TransferListProps } from './types';

const PERMISSIONS = ['Read issues', 'Write issues', 'Manage labels', 'Merge pull requests', 'Delete repository', 'Manage billing'];

export default function Playground({ impl }: { impl: { default: ComponentType<TransferListProps> } }) {
  const TransferList = impl.default;
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 720 }}>
      <section>
        <h3>Permissions</h3>
        <TransferList leftItems={PERMISSIONS.slice(0, 4)} rightItems={PERMISSIONS.slice(4)} leftTitle="Available" rightTitle="Granted" />
      </section>
      <section>
        <h3>Empty right list</h3>
        <TransferList leftItems={['HTML', 'CSS', 'JavaScript', 'TypeScript', 'React']} rightItems={[]} />
      </section>
    </div>
  );
}
