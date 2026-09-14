// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { NavItem, NavbarProps } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);
const Navbar = impl.default;

const ITEMS: NavItem[] = [
  { label: 'Home', href: '/' },
  {
    label: 'Products',
    children: [
      { label: 'Analytics', href: '/products/analytics' },
      { label: 'Automation', href: '/products/automation' },
    ],
  },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
];

function setup(props: Partial<NavbarProps> = {}) {
  const onNavigate = vi.fn();
  const user = userEvent.setup();
  render(<Navbar brand="Acme" items={ITEMS} currentHref="/pricing" onNavigate={onNavigate} {...props} />);
  return { user, onNavigate };
}

/** Unreachable = hidden attribute, inert, or inline display:none / visibility:hidden on the element or an ancestor. */
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
const reachableLinks = (name: string) =>
  screen.queryAllByRole('link', { name, hidden: true }).filter((el) => isReachable(el));
const link = (name: string) => {
  const found = reachableLinks(name);
  expect(found).toHaveLength(1);
  return found[0];
};
const menuButton = () => screen.getByRole('button', { name: 'Menu' });

describeTask('Responsive Navbar', () => {
  it('renders a "Main" navigation with inline links and no Menu button on desktop', () => {
    setup({ isMobile: false });
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const name of ['Home', 'Pricing', 'About']) {
      expect(within(nav).getByRole('link', { name })).toBe(link(name));
    }
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
  });

  it('marks only the current link with aria-current="page"', () => {
    setup({ isMobile: false, currentHref: '/pricing' });
    expect(link('Pricing')).toHaveAttribute('aria-current', 'page');
    expect(link('Home')).not.toHaveAttribute('aria-current');
    expect(link('About')).not.toHaveAttribute('aria-current');
  });

  it('renders a collapsed Menu button on mobile with the links unreachable', () => {
    setup({ isMobile: true });
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveAttribute('aria-controls');
    expect(reachableLinks('Pricing')).toHaveLength(0);
    expect(reachableLinks('Home')).toHaveLength(0);
  });

  it('opens and closes the mobile menu with the Menu button', async () => {
    const { user } = setup({ isMobile: true });
    await user.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');
    const controlled = document.getElementById(menuButton().getAttribute('aria-controls')!);
    expect(controlled).not.toBeNull();
    expect(within(controlled!).getByRole('link', { name: 'Pricing' })).toBe(link('Pricing'));
    expect(link('Pricing')).toHaveAttribute('aria-current', 'page');

    await user.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(reachableLinks('Pricing')).toHaveLength(0);
  });

  it('closes the mobile menu on Escape and returns focus to the Menu button', async () => {
    const { user } = setup({ isMobile: true });
    await user.click(menuButton());
    link('About').focus();
    await user.keyboard('{Escape}');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveFocus();
    expect(reachableLinks('About')).toHaveLength(0);
  });

  it('navigates, closes the mobile menu and refocuses the Menu button when a link is clicked', async () => {
    const { user, onNavigate } = setup({ isMobile: true });
    await user.click(menuButton());
    await user.click(link('About'));
    expect(onNavigate).toHaveBeenCalledWith('/about');
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveFocus();
  });

  it('toggles the Products submenu as a disclosure', async () => {
    const { user } = setup({ isMobile: false, currentHref: '/products/automation' });
    const products = screen.getByRole('button', { name: 'Products' });
    expect(products).toHaveAttribute('aria-expanded', 'false');
    expect(reachableLinks('Analytics')).toHaveLength(0);

    await user.click(products);
    expect(products).toHaveAttribute('aria-expanded', 'true');
    const submenu = document.getElementById(products.getAttribute('aria-controls')!);
    expect(submenu).not.toBeNull();
    expect(within(submenu!).getByRole('link', { name: 'Analytics' })).toBe(link('Analytics'));
    expect(link('Automation')).toHaveAttribute('aria-current', 'page');
    expect(link('Pricing')).not.toHaveAttribute('aria-current');

    await user.click(products);
    expect(products).toHaveAttribute('aria-expanded', 'false');
    expect(reachableLinks('Analytics')).toHaveLength(0);
  });

  it('closes a desktop submenu on Escape and focuses its button', async () => {
    const { user } = setup({ isMobile: false });
    await user.click(screen.getByRole('button', { name: 'Products' }));
    link('Automation').focus();
    await user.keyboard('{Escape}');
    const products = screen.getByRole('button', { name: 'Products' });
    expect(products).toHaveAttribute('aria-expanded', 'false');
    expect(products).toHaveFocus();
  });

  it('closes a desktop submenu when one of its links is clicked', async () => {
    const { user, onNavigate } = setup({ isMobile: false });
    await user.click(screen.getByRole('button', { name: 'Products' }));
    await user.click(link('Analytics'));
    expect(onNavigate).toHaveBeenCalledWith('/products/analytics');
    expect(screen.getByRole('button', { name: 'Products' })).toHaveAttribute('aria-expanded', 'false');
  });
});

describeTask('Responsive Navbar: matchMedia', () => {
  const original = window.matchMedia;
  afterEach(() => {
    window.matchMedia = original;
  });

  function stubMatchMedia(initial: boolean) {
    const listeners = new Set<(e: { matches: boolean }) => void>();
    const mql = {
      matches: initial,
      media: '',
      onchange: null,
      addEventListener: (_type: string, cb: (e: { matches: boolean }) => void) => listeners.add(cb),
      removeEventListener: (_type: string, cb: (e: { matches: boolean }) => void) => listeners.delete(cb),
      addListener: (cb: (e: { matches: boolean }) => void) => listeners.add(cb),
      removeListener: (cb: (e: { matches: boolean }) => void) => listeners.delete(cb),
      dispatchEvent: () => false,
    };
    window.matchMedia = vi.fn((query: string) => {
      mql.media = query;
      return mql as unknown as MediaQueryList;
    });
    const change = (matches: boolean) =>
      act(() => {
        mql.matches = matches;
        for (const cb of [...listeners]) cb({ matches });
      });
    return { change, listeners };
  }

  it('uses matchMedia when isMobile is not passed and follows its change events', async () => {
    const { change } = stubMatchMedia(true);
    setup();
    expect(menuButton()).toBeInTheDocument();
    expect(reachableLinks('Pricing')).toHaveLength(0);

    change(false);
    expect(screen.queryByRole('button', { name: 'Menu' })).not.toBeInTheDocument();
    expect(link('Pricing')).toBeInTheDocument();

    change(true);
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('removes its matchMedia listener on unmount', () => {
    const { listeners } = stubMatchMedia(false);
    const { unmount } = render(<Navbar brand="Acme" items={ITEMS} currentHref="/" onNavigate={() => {}} />);
    expect(listeners.size).toBeGreaterThan(0);
    unmount();
    expect(listeners.size).toBe(0);
  });
});
