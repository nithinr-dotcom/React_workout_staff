// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { HolyGrailLayoutProps, LayoutLink } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const HolyGrailLayout = impl.default;

const LINKS: LayoutLink[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Orders', href: '/orders' },
  { label: 'Settings', href: '/settings' },
];

function setup(props: Partial<HolyGrailLayoutProps> = {}) {
  const user = userEvent.setup();
  const utils = render(
    <HolyGrailLayout
      siteTitle="ShopAdmin"
      navLinks={LINKS}
      pageTitle="Recent orders"
      asideTitle="Order summary"
      aside={<p>12 orders pending</p>}
      footer={<p>© 2026 ShopAdmin</p>}
      {...props}
    >
      <p>Order #1042 shipped</p>
    </HolyGrailLayout>,
  );
  return { user, ...utils };
}

/** Links inside an element with `hidden`, `inert`, or inline display:none / visibility:hidden are unreachable. */
function isReachable(el: Element): boolean {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (node instanceof HTMLElement) {
      if (node.hidden || node.hasAttribute('inert')) return false;
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
    }
  }
  return true;
}

describeTask('Holy Grail Layout', () => {
  it('renders one banner, main and contentinfo landmark', () => {
    setup();
    expect(screen.getAllByRole('banner')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
    expect(within(screen.getByRole('banner')).getByText('ShopAdmin')).toBeInTheDocument();
    expect(within(screen.getByRole('contentinfo')).getByText('© 2026 ShopAdmin')).toBeInTheDocument();
  });

  it('renders a "Primary" navigation with a link per navLinks entry', () => {
    setup();
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    for (const { label, href } of LINKS) {
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  it('has exactly one h1, the page title, inside main along with the children', () => {
    setup();
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent('Recent orders');
    const main = screen.getByRole('main');
    expect(main).toContainElement(h1s[0]);
    expect(within(main).getByText('Order #1042 shipped')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'ShopAdmin' })).not.toBeInTheDocument();
  });

  it('renders the aside as a complementary landmark named by its h2', () => {
    setup();
    const aside = screen.getByRole('complementary', { name: 'Order summary' });
    expect(within(aside).getByRole('heading', { level: 2, name: 'Order summary' })).toBeInTheDocument();
    expect(within(aside).getByText('12 orders pending')).toBeInTheDocument();
  });

  it('renders no complementary landmark when aside is undefined', () => {
    setup({ aside: undefined });
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
  });

  it('keeps content-first source order: banner, main, navigation, complementary, contentinfo', () => {
    setup();
    const order = [
      screen.getByRole('banner'),
      screen.getByRole('main'),
      screen.getByRole('navigation', { name: 'Primary' }),
      screen.getByRole('complementary'),
      screen.getByRole('contentinfo'),
    ];
    for (let i = 0; i < order.length - 1; i++) {
      const relation = order[i].compareDocumentPosition(order[i + 1]);
      expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('starts with a skip link that targets main', async () => {
    const { user } = setup();
    await user.tab();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveFocus();
    const main = screen.getByRole('main');
    expect(main.id).toBeTruthy();
    expect(skip).toHaveAttribute('href', `#${main.id}`);
    expect(main).toHaveAttribute('tabindex', '-1');
  });

  it('does not share the main id between two layouts', () => {
    render(
      <>
        <HolyGrailLayout siteTitle="A" navLinks={LINKS} pageTitle="One" footer="f">
          x
        </HolyGrailLayout>
        <HolyGrailLayout siteTitle="B" navLinks={LINKS} pageTitle="Two" footer="f">
          y
        </HolyGrailLayout>
      </>,
    );
    const [first, second] = screen.getAllByRole('main');
    expect(first.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
  });
});

describeFollowUp(2, 'collapsible sidebar', () => {
  it('collapses and expands the navigation with a disclosure button', async () => {
    const { user } = setup({ collapsibleNav: true });
    const toggle = screen.getByRole('button', { name: 'Toggle navigation' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const controlled = document.getElementById(toggle.getAttribute('aria-controls') ?? '');
    expect(controlled).not.toBeNull();
    const dashboard = () => screen.getAllByRole('link', { name: 'Dashboard', hidden: true }).filter(isReachable);

    expect(controlled!.contains(dashboard()[0])).toBe(true);

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(dashboard()).toHaveLength(0);

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(dashboard()).toHaveLength(1);
  });

  it('renders no toggle button by default', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'Toggle navigation' })).not.toBeInTheDocument();
  });
});
