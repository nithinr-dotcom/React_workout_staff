import type { AnchorHTMLAttributes, ComponentType, ReactNode } from 'react';

export interface RouterProps {
  children?: ReactNode;
}

export interface RoutesProps {
  /** `<Route>` elements (direct children). */
  children?: ReactNode;
}

export interface RouteProps {
  /** `/`, `/about`, `/users/:id`, `/users/:id/posts/:postId`, or `*` for the fallback. */
  path: string;
  element: ReactNode;
}

export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Absolute path, e.g. `/users/42`. May include `?query` and `#hash`. */
  to: string;
  /** Use `replaceState` instead of `pushState`. */
  replace?: boolean;
}

export type Params = Record<string, string>;

export interface NavigateOptions {
  replace?: boolean;
}

export type NavigateFunction = (to: string, options?: NavigateOptions) => void;

/** Follow-up 3. */
export type SetSearchParams = (next: Record<string, string> | URLSearchParams, options?: NavigateOptions) => void;

export interface MiniRouterModule {
  Router: ComponentType<RouterProps>;
  Routes: ComponentType<RoutesProps>;
  Route: ComponentType<RouteProps>;
  Link: ComponentType<LinkProps>;
  useParams(): Params;
  useNavigate(): NavigateFunction;
  /** Follow-up 3. */
  useSearchParams(): [URLSearchParams, SetSearchParams];
}
