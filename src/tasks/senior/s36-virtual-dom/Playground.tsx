import { useEffect, useRef, useState } from 'react';
import type { VNode, VirtualDomModule } from './types';

interface TodoState {
  todos: { id: number; text: string; done: boolean }[];
  draftCount: number;
}

const INITIAL: TodoState = {
  todos: [
    { id: 1, text: 'Write h()', done: true },
    { id: 2, text: 'Write render()', done: false },
    { id: 3, text: 'Write patch()', done: false },
  ],
  draftCount: 0,
};

/**
 * The demo app is built with the task's own `h`, mounted with `render` and updated with `patch`.
 * A MutationObserver counts how many DOM mutations each update caused.
 */
export default function Playground({ impl }: { impl: VirtualDomModule }) {
  const host = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastMutations, setLastMutations] = useState<number | null>(null);
  const [totalMutations, setTotalMutations] = useState(0);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let state = INITIAL;
    let current: VNode | null = null;
    let nextId = 4;
    const observer = new MutationObserver(() => {});
    observer.observe(container, { childList: true, attributes: true, characterData: true, subtree: true });

    const view = (s: TodoState): VNode =>
      impl.h(
        'div',
        { class: 'vdom-demo' },
        impl.h('p', null, 'Remaining: ', s.todos.filter((t) => !t.done).length, ' of ', s.todos.length),
        impl.h(
          'ul',
          { style: 'padding-left: 18px' },
          s.todos.map((t) =>
            impl.h(
              'li',
              { key: t.id, style: t.done ? 'text-decoration: line-through; color: #667085' : null },
              impl.h('input', {
                type: 'checkbox',
                checked: t.done,
                'aria-label': t.text,
                onChange: () => update({ ...state, todos: state.todos.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) }),
              }),
              ' ',
              t.text,
            ),
          ),
        ),
        impl.h('button', { type: 'button', onClick: () => update({ ...state, todos: [...state.todos, { id: nextId, text: `Task ${nextId++}`, done: false }] }) }, 'Add'),
        ' ',
        impl.h('button', { type: 'button', onClick: () => update({ ...state, todos: [...state.todos].reverse() }) }, 'Reverse'),
        ' ',
        impl.h('button', { type: 'button', onClick: () => update({ ...state, todos: state.todos.slice(0, -1) }) }, 'Remove last'),
        ' ',
        impl.h('button', { type: 'button', onClick: () => update({ ...state, draftCount: state.draftCount + 1 }) }, `No-op re-render (${state.draftCount})`),
      );

    function update(next: TodoState) {
      state = next;
      try {
        const nextVNode = view(state);
        if (current === null) impl.render(nextVNode, container!);
        else impl.patch(container!, current, nextVNode);
        current = nextVNode;
        const count = observer.takeRecords().length;
        setLastMutations(count);
        setTotalMutations((t) => t + count);
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      }
    }

    update(INITIAL);
    observer.takeRecords();
    setTotalMutations(0);
    setLastMutations(null);

    return () => {
      observer.disconnect();
      container.replaceChildren();
    };
  }, [impl]);

  return (
    <div style={{ fontFamily: 'system-ui', display: 'grid', gap: 12, maxWidth: 520 }}>
      <p style={{ margin: 0, color: '#667085', fontSize: 13 }}>
        This UI is rendered by your <code>h</code> / <code>render</code> / <code>patch</code>, not React. Toggle a checkbox: a
        minimal patch should cause only a few mutations. The “No-op” button changes one text node, so it should cause one
        mutation.
      </p>
      {error && <p style={{ color: '#b91c1c' }}>Error: {error}</p>}
      <div ref={host} style={{ border: '1px solid #d0d5dd', borderRadius: 8, padding: 12, minHeight: 80 }} />
      <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 13 }}>
        Mutations in last update: <strong>{lastMutations ?? '–'}</strong> · total since mount: <strong>{totalMutations}</strong>
      </p>
    </div>
  );
}
