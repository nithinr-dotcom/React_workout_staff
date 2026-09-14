export interface Observer<T> {
  next(value: T): void;
  error(error: unknown): void;
  complete(): void;
}

/** What `subscribe` accepts: a partial observer or just a `next` function. */
export type ObserverOrNext<T> = Partial<Observer<T>> | ((value: T) => void);

export interface Subscription {
  unsubscribe(): void;
}

/** Handed to the function passed to `new Observable(...)`. */
export interface Subscriber<T> extends Observer<T> {
  /** True after complete, error or unsubscribe. */
  readonly closed: boolean;
}

/** What the subscribe function may return: a cleanup function, a subscription, or nothing. */
export type TeardownLogic = (() => void) | Subscription | void;

export type SubscribeFn<T> = (subscriber: Subscriber<T>) => TeardownLogic;

export type OperatorFunction<T, R> = (source: IObservable<T>) => IObservable<R>;

export interface IObservable<T> {
  subscribe(observer?: ObserverOrNext<T>): Subscription;
  pipe(): IObservable<T>;
  pipe<A>(op1: OperatorFunction<T, A>): IObservable<A>;
  pipe<A, B>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>): IObservable<B>;
  pipe<A, B, C>(op1: OperatorFunction<T, A>, op2: OperatorFunction<A, B>, op3: OperatorFunction<B, C>): IObservable<C>;
  pipe(...operators: OperatorFunction<any, any>[]): IObservable<any>;
}

export interface ISubject<T> extends IObservable<T>, Observer<T> {}

export interface IBehaviorSubject<T> extends ISubject<T> {
  getValue(): T;
}

export interface ObservableConstructor {
  new <T>(subscribe: SubscribeFn<T>): IObservable<T>;
  /** Emits each item of an iterable synchronously, or the value of a promise, then completes. */
  from<T>(input: Iterable<T> | PromiseLike<T>): IObservable<T>;
  /** Emits 0, 1, 2, … every `ms`. Each subscriber gets its own timer. */
  interval(ms: number): IObservable<number>;
  /** Emits every `type` event dispatched on `target` while subscribed. */
  fromEvent<E extends Event = Event>(target: EventTarget, type: string): IObservable<E>;
}

export interface ObservableModule {
  Observable: ObservableConstructor;
  Subject: new <T>() => ISubject<T>;
  map<T, R>(project: (value: T, index: number) => R): OperatorFunction<T, R>;
  filter<T>(predicate: (value: T, index: number) => boolean): OperatorFunction<T, T>;

  /** Follow-up 1 */
  BehaviorSubject: new <T>(initialValue: T) => IBehaviorSubject<T>;
  /** Follow-up 2 */
  switchMap<T, R>(project: (value: T, index: number) => IObservable<R>): OperatorFunction<T, R>;
  /** Follow-up 3 */
  takeUntil<T>(notifier: IObservable<unknown>): OperatorFunction<T, T>;
}
