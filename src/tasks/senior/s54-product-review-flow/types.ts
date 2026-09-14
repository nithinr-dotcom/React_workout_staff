export interface Review {
  /** Whole stars, 1–5. */
  rating: number;
  /** Trimmed review text, 1–100 characters. */
  text: string;
}

export interface Purchase {
  /** Unique, stable product id. */
  id: string;
  name: string;
  /** ISO date, e.g. "2026-08-30". */
  purchasedAt: string;
  price: number;
  /** The existing review, or null when the product hasn't been reviewed yet. */
  review: Review | null;
}

export interface RequestOptions {
  signal?: AbortSignal;
}

export interface ReviewApi {
  getPurchases(options?: RequestOptions): Promise<Purchase[]>;
  /** Resolves with the saved review. Rejects when the server fails. */
  submitReview(productId: string, review: Review, options?: RequestOptions): Promise<Review>;
}

export interface ProductReviewFlowProps {
  api: ReviewApi;
  /** localStorage key that holds the drafts for every product. Default "review-drafts". */
  storageKey?: string;
}

export const MAX_REVIEW_LENGTH = 100;
