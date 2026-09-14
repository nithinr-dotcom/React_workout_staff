import type {
  LinkProps,
  NavigateFunction,
  Params,
  RouteProps,
  RouterProps,
  RoutesProps,
  SetSearchParams,
} from './types';
import styles from './Solution.module.css';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

// Your implementation here. Requirements are in README.md.
// Do not import anything from react-router.

export function Router({ children }: RouterProps) {
  return <div className={styles.root}>Router: start coding in Solution.tsx {children}</div>;
}

export function Routes({ children }: RoutesProps) {
  void children;
  return null;
}

export function Route({ path, element }: RouteProps) {
  void path;
  void element;
  return null;
}

export function Link({ to, replace, children, ...rest }: LinkProps) {
  void replace;
  return (
    <a href={to} {...rest}>
      {children}
    </a>
  );
}

export function useParams(): Params {
  throw new Error('useParams: not implemented');
}

export function useNavigate(): NavigateFunction {
  throw new Error('useNavigate: not implemented');
}

/** Follow-up 3. */
export function useSearchParams(): [URLSearchParams, SetSearchParams] {
  throw new Error('useSearchParams: not implemented');
}
