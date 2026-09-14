// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi, type Mock } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { Purchase, Review, ReviewApi } from './types';

const { impl, describeTask, describeFollowUp } = pickTarget(Solution, Reference);
const ProductReviewFlow = impl.default;

const PURCHASES: Purchase[] = [
  { id: 'p1', name: 'Wireless Mouse', purchasedAt: '2026-08-30', price: 799, review: null },
  { id: 'p2', name: 'Laptop Stand', purchasedAt: '2026-08-21', price: 1299, review: null },
  { id: 'p3', name: 'Water Bottle', purchasedAt: '2026-08-02', price: 549, review: { rating: 5, text: 'Keeps water cold all day.' } },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type ApiMocks = { [K in keyof ReviewApi]: Mock<ReviewApi[K]> };

function makeApi(overrides: Partial<ApiMocks> = {}): ApiMocks {
  return {
    getPurchases: vi.fn<ReviewApi['getPurchases']>(() => Promise.resolve(structuredClone(PURCHASES))),
    submitReview: vi.fn<ReviewApi['submitReview']>((_id: string, review: Review) => Promise.resolve(review)),
    ...overrides,
  };
}

async function setup(api = makeApi(), storageKey = 'test-drafts') {
  const user = userEvent.setup();
  const utils = render(<ProductReviewFlow api={api} storageKey={storageKey} />);
  await screen.findByRole('list', { name: 'Purchases' });
  return { user, api, ...utils };
}

const productButton = (name: string) =>
  within(screen.getByRole('list', { name: 'Purchases' })).getByRole('button', { name: new RegExp(name) });
const productItem = (name: string) =>
  within(screen.getByRole('list', { name: 'Purchases' }))
    .getAllByRole('listitem')
    .find((li) => li.textContent?.includes(name))!;
const pane = (name: string) => screen.getByRole('region', { name: `Review ${name}` });

describeTask('ProductReviewFlow', () => {
  it('shows a loading state, then the purchases with Reviewed badges', async () => {
    const d = deferred<Purchase[]>();
    const api = makeApi({ getPurchases: vi.fn<ReviewApi['getPurchases']>(() => d.promise) });
    render(<ProductReviewFlow api={api} storageKey="test-drafts" />);
    expect(screen.getByText(/loading purchases/i)).toBeInTheDocument();
    expect(api.getPurchases).toHaveBeenCalledTimes(1);
    await act(async () => d.resolve(structuredClone(PURCHASES)));
    expect(screen.queryByText(/loading purchases/i)).not.toBeInTheDocument();
    const items = within(screen.getByRole('list', { name: 'Purchases' })).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(productItem('Water Bottle')).toHaveTextContent('Reviewed');
    expect(productItem('Wireless Mouse')).not.toHaveTextContent('Reviewed');
    expect(screen.getByText('Select a product to review')).toBeInTheDocument();
  });

  it('shows an error with Retry when loading fails', async () => {
    const user = userEvent.setup();
    const getPurchases = vi
      .fn<ReviewApi['getPurchases']>()
      .mockRejectedValueOnce(new Error('500'))
      .mockResolvedValueOnce(structuredClone(PURCHASES));
    render(<ProductReviewFlow api={makeApi({ getPurchases })} storageKey="test-drafts" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to load purchases');
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('list', { name: 'Purchases' })).toBeInTheDocument();
    expect(getPurchases).toHaveBeenCalledTimes(2);
  });

  it('opens a review pane for the clicked product at step 1', async () => {
    const { user } = await setup();
    await user.click(productButton('Wireless Mouse'));
    expect(productButton('Wireless Mouse')).toHaveAttribute('aria-current', 'true');
    expect(productButton('Laptop Stand')).not.toHaveAttribute('aria-current', 'true');
    const region = pane('Wireless Mouse');
    expect(region).toHaveTextContent('Step 1 of 2');
    expect(within(region).getAllByRole('radio')).toHaveLength(5);
    expect(within(region).getByRole('radio', { name: '1 star' })).toBeInTheDocument();
    expect(within(region).getByRole('radio', { name: '5 stars' })).toBeInTheDocument();
  });

  it('requires a rating before moving to step 2', async () => {
    const { user } = await setup();
    await user.click(productButton('Wireless Mouse'));
    const region = pane('Wireless Mouse');
    const next = within(region).getByRole('button', { name: 'Next' });
    expect(next).toBeDisabled();
    await user.click(next);
    expect(region).toHaveTextContent('Step 1 of 2');
    await user.click(within(region).getByRole('radio', { name: '4 stars' }));
    expect(next).toBeEnabled();
    await user.click(next);
    expect(pane('Wireless Mouse')).toHaveTextContent('Step 2 of 2');
    expect(screen.getByRole('textbox', { name: 'Review' })).toHaveFocus();
  });

  it('shows a live counter and only enables Submit for 1–100 non-blank characters', async () => {
    const { user } = await setup();
    await user.click(productButton('Wireless Mouse'));
    await user.click(screen.getByRole('radio', { name: '3 stars' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    const textbox = screen.getByRole('textbox', { name: 'Review' });
    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(screen.getByText('0/100')).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.type(textbox, '   ');
    expect(screen.getByText('3/100')).toBeInTheDocument();
    expect(submit).toBeDisabled();

    await user.clear(textbox);
    await user.type(textbox, 'Great');
    expect(screen.getByText('5/100')).toBeInTheDocument();
    expect(submit).toBeEnabled();

    await user.clear(textbox);
    await user.click(textbox);
    await user.paste('x'.repeat(105));
    const length = (textbox as HTMLTextAreaElement).value.length;
    // Either the field is capped at 100, or the user can go over and Submit is disabled.
    if (length > 100) expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
    else expect(screen.getByText('100/100')).toBeInTheDocument();
  });

  it('Back keeps the rating and the text', async () => {
    const { user } = await setup();
    await user.click(productButton('Laptop Stand'));
    await user.click(screen.getByRole('radio', { name: '2 stars' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByRole('textbox', { name: 'Review' }), 'Wobbly');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(pane('Laptop Stand')).toHaveTextContent('Step 1 of 2');
    expect(screen.getByRole('radio', { name: '2 stars' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('textbox', { name: 'Review' })).toHaveValue('Wobbly');
  });

  it('submits the trimmed review, disables Submit while pending, then shows the toast and Reviewed', async () => {
    const d = deferred<Review>();
    const { user, api } = await setup(makeApi({ submitReview: vi.fn<ReviewApi['submitReview']>(() => d.promise) }));
    await user.click(productButton('Wireless Mouse'));
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByRole('textbox', { name: 'Review' }), '  Smooth and quiet  ');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(api.submitReview).toHaveBeenCalledTimes(1);
    expect(api.submitReview.mock.calls[0][0]).toBe('p1');
    expect(api.submitReview.mock.calls[0][1]).toEqual({ rating: 4, text: 'Smooth and quiet' });
    const pending = within(pane('Wireless Mouse')).getByRole('button', { name: /submit/i });
    expect(pending).toBeDisabled();
    await user.click(pending);
    expect(api.submitReview).toHaveBeenCalledTimes(1);

    await act(async () => d.resolve({ rating: 4, text: 'Smooth and quiet' }));
    expect(screen.getAllByRole('status').some((el) => el.textContent?.includes('Review submitted'))).toBe(true);
    expect(productItem('Wireless Mouse')).toHaveTextContent('Reviewed');
    expect(pane('Wireless Mouse')).toHaveTextContent('Smooth and quiet');
    expect(within(pane('Wireless Mouse')).queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
  });

  it('keeps the form and shows an alert when submitting fails', async () => {
    const d = deferred<Review>();
    const { user } = await setup(makeApi({ submitReview: vi.fn<ReviewApi['submitReview']>(() => d.promise) }));
    await user.click(productButton('Wireless Mouse'));
    await user.click(screen.getByRole('radio', { name: '5 stars' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByRole('textbox', { name: 'Review' }), 'Love it');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await act(async () => d.reject(new Error('500')));

    const region = pane('Wireless Mouse');
    expect(within(region).getByRole('alert')).toHaveTextContent('Could not submit review');
    expect(within(region).getByRole('textbox', { name: 'Review' })).toHaveValue('Love it');
    expect(within(region).getByRole('button', { name: 'Submit' })).toBeEnabled();
    expect(productItem('Wireless Mouse')).not.toHaveTextContent('Reviewed');
  });

  it('keeps a separate draft per product when switching', async () => {
    const { user } = await setup();
    await user.click(productButton('Wireless Mouse'));
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByRole('textbox', { name: 'Review' }), 'Nice grip');

    await user.click(productButton('Laptop Stand'));
    expect(pane('Laptop Stand')).toHaveTextContent('Step 1 of 2');
    expect(screen.getAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false);

    await user.click(productButton('Wireless Mouse'));
    expect(pane('Wireless Mouse')).toHaveTextContent('Step 1 of 2');
    expect(screen.getByRole('radio', { name: '4 stars' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('textbox', { name: 'Review' })).toHaveValue('Nice grip');
  });

  it('persists drafts to localStorage across a remount', async () => {
    const { user, unmount } = await setup();
    await user.click(productButton('Laptop Stand'));
    await user.click(screen.getByRole('radio', { name: '3 stars' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByRole('textbox', { name: 'Review' }), 'Decent');
    await user.click(productButton('Wireless Mouse'));
    unmount();
    expect(localStorage.getItem('test-drafts')).not.toBeNull();

    const again = await setup();
    await again.user.click(productButton('Laptop Stand'));
    expect(screen.getByRole('radio', { name: '3 stars' })).toBeChecked();
    await again.user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('textbox', { name: 'Review' })).toHaveValue('Decent');
  });

  it('shows the saved review read-only for an already reviewed product', async () => {
    const { user } = await setup();
    await user.click(productButton('Water Bottle'));
    const region = pane('Water Bottle');
    expect(region).toHaveTextContent('Keeps water cold all day.');
    expect(within(region).queryByRole('radio')).not.toBeInTheDocument();
    expect(within(region).queryByRole('button', { name: /submit/i })).not.toBeInTheDocument();
  });
});

describeFollowUp(3, 'optimistic submit with rollback', () => {
  it('marks the product Reviewed immediately and rolls back with the draft restored on failure', async () => {
    const d = deferred<Review>();
    const { user } = await setup(makeApi({ submitReview: vi.fn<ReviewApi['submitReview']>(() => d.promise) }));
    await user.click(productButton('Laptop Stand'));
    await user.click(screen.getByRole('radio', { name: '2 stars' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.type(screen.getByRole('textbox', { name: 'Review' }), 'Wobbles a bit');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(productItem('Laptop Stand')).toHaveTextContent('Reviewed');

    await act(async () => d.reject(new Error('500')));
    expect(productItem('Laptop Stand')).not.toHaveTextContent('Reviewed');
    const region = pane('Laptop Stand');
    expect(within(region).getByRole('alert')).toHaveTextContent('Could not submit review');
    expect(within(region).getByRole('textbox', { name: 'Review' })).toHaveValue('Wobbles a bit');
  });
});
