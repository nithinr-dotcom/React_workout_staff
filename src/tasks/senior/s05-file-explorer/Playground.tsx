import { useState, type ComponentType } from 'react';
import { FILE_TREE } from '../../../mocks/data/datasets';
import type { FileExplorerProps, FileNode } from './types';

const MONOREPO: FileNode[] = [
  {
    id: 'apps',
    name: 'apps',
    type: 'folder',
    children: [
      {
        id: 'apps/web',
        name: 'web',
        type: 'folder',
        children: [
          { id: 'apps/web/page10.tsx', name: 'page10.tsx', type: 'file' },
          { id: 'apps/web/page2.tsx', name: 'page2.tsx', type: 'file' },
          { id: 'apps/web/Layout.tsx', name: 'Layout.tsx', type: 'file' },
        ],
      },
      { id: 'apps/admin', name: 'admin', type: 'folder', children: [] },
    ],
  },
  { id: 'turbo.json', name: 'turbo.json', type: 'file' },
  { id: '.gitignore', name: '.gitignore', type: 'file' },
];

export default function Playground({ impl }: { impl: { default: ComponentType<FileExplorerProps> } }) {
  const FileExplorer = impl.default;
  const [opened, setOpened] = useState<string | null>(null);
  return (
    <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <section>
        <h3>Project (FILE_TREE, src expanded)</h3>
        <FileExplorer initialTree={FILE_TREE} defaultExpandedIds={['src']} onSelect={(node) => setOpened(node.id)} />
        <p>Opened: {opened ?? 'nothing yet'}</p>
      </section>
      <section>
        <h3>Natural sort + empty folder</h3>
        <FileExplorer initialTree={MONOREPO} defaultExpandedIds={['apps', 'apps/web']} />
      </section>
      <section>
        <h3>Empty</h3>
        <FileExplorer initialTree={[]} />
      </section>
    </div>
  );
}
