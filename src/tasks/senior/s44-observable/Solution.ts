import type { IObservable, ObserverOrNext, OperatorFunction, SubscribeFn, Subscription } from './types';

// ⬇ Delete this line when you start. Tests for this task are skipped while it exists.
export const NOT_STARTED = true;

export class Observable<T> implements IObservable<T> {
  // Your implementation here. Requirements are in README.md.

  constructor(subscribe: SubscribeFn<T>) {
    void subscribe;
  }

  subscribe(observer?: ObserverOrNext<T>): Subscription {
    void observer;
    throw new Error('Observable.subscribe: not implemented');
  }

  pipe(...operators: OperatorFunction<any, any>[]): IObservable<any> {
    void operators;
    throw new Error('Observable.pipe: not implemented');
  }

  static from<T>(input: Iterable<T> | PromiseLike<T>): Observable<T> {
    void input;
    throw new Error('Observable.from: not implemented');
  }

  static interval(ms: number): Observable<number> {
    void ms;
    throw new Error('Observable.interval: not implemented');
  }

  static fromEvent<E extends Event = Event>(target: EventTarget, type: string): Observable<E> {
    void target;
    void type;
    throw new Error('Observable.fromEvent: not implemented');
  }
}

export class Subject<T> extends Observable<T> {
  constructor() {
    super(() => {});
  }

  next(value: T): void {
    void value;
    throw new Error('Subject.next: not implemented');
  }

  error(error: unknown): void {
    void error;
    throw new Error('Subject.error: not implemented');
  }

  complete(): void {
    throw new Error('Subject.complete: not implemented');
  }
}

export function map<T, R>(project: (value: T, index: number) => R): OperatorFunction<T, R> {
  void project;
  throw new Error('map: not implemented');
}

export function filter<T>(predicate: (value: T, index: number) => boolean): OperatorFunction<T, T> {
  void predicate;
  throw new Error('filter: not implemented');
}

/** Follow-up 1 */
export class BehaviorSubject<T> extends Subject<T> {
  constructor(initialValue: T) {
    super();
    void initialValue;
  }

  getValue(): T {
    throw new Error('BehaviorSubject.getValue: not implemented');
  }
}

/** Follow-up 2 */
export function switchMap<T, R>(project: (value: T, index: number) => IObservable<R>): OperatorFunction<T, R> {
  void project;
  throw new Error('switchMap: not implemented');
}

/** Follow-up 3 */
export function takeUntil<T>(notifier: IObservable<unknown>): OperatorFunction<T, T> {
  void notifier;
  throw new Error('takeUntil: not implemented');
}
