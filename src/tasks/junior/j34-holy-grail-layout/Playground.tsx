import { useState, type ComponentType } from 'react';
import type { HolyGrailLayoutProps, LayoutLink } from './types';

const LINKS: LayoutLink[] = [
  { label: 'Dashboard', href: '#dashboard' },
  { label: 'Orders', href: '#orders' },
  { label: 'Products', href: '#products' },
  { label: 'Customers', href: '#customers' },
  { label: 'Settings', href: '#settings' },
];

const ORDERS = Array.from({ length: 40 }, (_, i) => ({
  id: 1042 + i,
  customer: ['Priya Sharma', 'Arjun Mehta', 'Sara Khan', 'Rahul Nair', 'Meera Iyer'][i % 5],
  total: 499 + ((i * 373) % 4200),
  status: ['Shipped', 'Processing', 'Delivered', 'Cancelled'][i % 4],
}));

const CHECKLIST = [
  'Desktop: nav left, main fluid in the middle, aside right; header and footer full width.',
  'Columns are equal height with both short and long content.',
  'Short page: footer touches the bottom, no gap under it.',
  'Long page: footer follows the content and is not position: fixed.',
  'Below 720px (devtools device toolbar): header → main → nav → aside → footer.',
  'No aside: main takes the extra width.',
  'The long URL in main wraps instead of pushing the aside off-screen.',
  'First Tab shows the skip link; Enter moves focus into main.',
  'Zoom to 200%: nothing overlaps.',
];

export default function Playground({ impl }: { impl: { default: ComponentType<HolyGrailLayoutProps> } }) {
  const HolyGrailLayout = impl.default;
  const [long, setLong] = useState(false);
  const [withAside, setWithAside] = useState(true);
  const [collapsible, setCollapsible] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST.map(() => false));

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <label>
          <input type="checkbox" checked={long} onChange={(e) => setLong(e.target.checked)} /> Long page
        </label>
        <label>
          <input type="checkbox" checked={withAside} onChange={(e) => setWithAside(e.target.checked)} /> With aside
        </label>
        <label>
          <input type="checkbox" checked={collapsible} onChange={(e) => setCollapsible(e.target.checked)} /> collapsibleNav
          (follow-up 2)
        </label>
      </div>

      <div style={{ border: '1px dashed #98a2b3' }}>
        <HolyGrailLayout
          siteTitle="ShopAdmin"
          navLinks={LINKS}
          pageTitle="Recent orders"
          asideTitle={withAside ? 'Order summary' : undefined}
          aside={
            withAside ? (
              <dl>
                <dt>Pending</dt>
                <dd>12</dd>
                <dt>Revenue today</dt>
                <dd>₹48,920</dd>
              </dl>
            ) : undefined
          }
          footer={<p>© 2026 ShopAdmin · Terms · Privacy</p>}
          collapsibleNav={collapsible}
        >
          <p>
            Tracking link: https://logistics.example.com/track/ORDER-1042-SHIPPED-VIA-BLUEDART-AWB-99812734561234
          </p>
          <ul>
            {(long ? ORDERS : ORDERS.slice(0, 3)).map((o) => (
              <li key={o.id}>
                #{o.id} · {o.customer} · ₹{o.total} · {o.status}
              </li>
            ))}
          </ul>
        </HolyGrailLayout>
      </div>

      <section>
        <h3>Visual self-check</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {CHECKLIST.map((item, i) => (
            <li key={item}>
              <label>
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))}
                />{' '}
                {item}
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
