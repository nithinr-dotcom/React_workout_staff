import { useState } from 'react';
import type { PaginationModule } from './types';

export default function Playground({ impl }: { impl: PaginationModule }) {
  const Pagination = impl.default;
  const [totalPages, setTotalPages] = useState(20);
  const [page, setPage] = useState(5);
  const [siblingCount, setSiblingCount] = useState(1);

  let itemsText: string;
  try {
    itemsText = impl
      .getPageItems(totalPages, page, siblingCount)
      .map((item) => (item === 'ellipsis' ? '…' : String(item)))
      .join(' ');
  } catch (e) {
    itemsText = `getPageItems threw: ${(e as Error).message}`;
  }

  return (
    <div style={{ display: 'grid', gap: 16, maxWidth: 640 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label>
          totalPages{' '}
          <input
            type="number"
            min={0}
            max={500}
            value={totalPages}
            onChange={(e) => setTotalPages(Number(e.target.value))}
            style={{ width: 70 }}
          />
        </label>
        <label>
          siblingCount{' '}
          <input
            type="number"
            min={0}
            max={5}
            value={siblingCount}
            onChange={(e) => setSiblingCount(Number(e.target.value))}
            style={{ width: 50 }}
          />
        </label>
      </div>
      <p>
        Current page: <strong>{page}</strong> · <code>getPageItems</code> → <code>{itemsText}</code>
      </p>
      <Pagination totalPages={totalPages} currentPage={page} siblingCount={siblingCount} onPageChange={setPage} />
    </div>
  );
}
