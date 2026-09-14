import type { ComponentType } from 'react';
import type { AccordionItem, AccordionProps } from './types';

const ITEMS: AccordionItem[] = [
  { id: 'what', title: 'What is an accordion?', content: 'A vertically stacked set of headers that reveal sections of content.' },
  { id: 'when', title: 'When should I use one?', content: 'When users only need a few sections at a time, e.g. FAQs or settings.' },
  { id: 'a11y', title: 'What makes it accessible?', content: 'Buttons with aria-expanded, regions with aria-labelledby, and arrow-key navigation.' },
];

export default function Playground({ impl }: { impl: { default: ComponentType<AccordionProps> } }) {
  const Accordion = impl.default;
  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 560 }}>
      <section>
        <h3>Single (default)</h3>
        <Accordion items={ITEMS} />
      </section>
      <section>
        <h3>allowMultiple + defaultOpenIds=['what']</h3>
        <Accordion items={ITEMS} allowMultiple defaultOpenIds={['what']} />
      </section>
      <section>
        <h3>Empty</h3>
        <Accordion items={[]} />
      </section>
    </div>
  );
}
