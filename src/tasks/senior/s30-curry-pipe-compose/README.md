# curry, pipe & compose

## Problem statement
Implement three functional-programming building blocks:

- `curry(fn, arity?)` turns `fn(a, b, c)` into a function you can call as `f(a)(b)(c)`, `f(a, b)(c)`, `f(a)(b, c)` or `f(a, b, c)`. It keeps collecting arguments until it has `arity` of them (default `fn.length`), then calls `fn`.
- `pipe(...fns)` returns a function that runs `fns` left to right, feeding each result into the next.
- `compose(...fns)` is the same, right to left.

These come up as warm-ups in Meta-style rounds and then escalate: placeholders, async steps and TypeScript typing.

## Clarifying questions to ask
- What arity should `curry` use? *(`fn.length` by default. An explicit `arity` argument overrides it, because default and rest parameters don't count towards `length`.)*
- What happens when a call passes more arguments than are still needed? *(They're passed through to `fn` along with the others.)*
- What does calling a partially applied function with no arguments do? *(Nothing is added; it returns a function in the same state. The exception is an arity of 0, where the first call invokes `fn`.)*
- Can a partial application be reused? *(Yes. `const add1 = add(1)` can be called many times with different continuations and they must not affect each other.)*
- What do `pipe()` and `compose()` with no functions return? *(An identity function that returns its first argument.)*
- Can the first function in a pipe take several arguments? *(Yes. Only the first step receives all arguments; later steps receive one value.)*
- Should `this` be forwarded? *(Nice to have: the `this` of the call that completes the arguments is used for `fn`. Not tested.)*

## Functional requirements
### curry
- [ ] `curry(fn)` returns a function. When at least `arity` arguments have been collected, `fn` is called with all collected arguments in order and its return value is returned.
- [ ] Before that, each call returns a new function that remembers the arguments so far.
- [ ] Any grouping of arguments across calls works: `f(1)(2)(3)`, `f(1, 2)(3)`, `f(1)(2, 3)`, `f(1, 2, 3)`.
- [ ] Partial applications are immutable and reusable: calling `add1(2)` and then `add1(10)` gives independent results.
- [ ] Calling with zero arguments doesn't count as progress.
- [ ] `arity` overrides `fn.length`. With arity 0, `curry(fn)()` calls `fn` immediately.
- [ ] Extra arguments in the completing call are passed through to `fn`.
- [ ] `fn` is not called until the arity is satisfied.

### pipe / compose
- [ ] `pipe(f, g, h)(...args)` returns `h(g(f(...args)))`.
- [ ] `compose(f, g, h)(...args)` returns `f(g(h(...args)))`.
- [ ] The first function to run receives every argument; each later function receives the previous return value.
- [ ] With no functions, both return their first argument unchanged.
- [ ] Creating the pipeline calls nothing. Each invocation of the pipeline runs every step once.

## Non-functional requirements
- No libraries.
- No shared mutable state between partial applications; each call creates its own argument list.
- `pipe` and `compose` should not duplicate logic. One can be expressed with the other.

## Constraints
- 45 minutes.
- Export `curry`, `pipe`, `compose` (and `pipeAsync` for follow-up 2) as named exports from `Solution.ts`.
- The placeholder symbol `__` is already exported from `types.ts`. Import it; don't create your own.

## Data / API contract
```ts
type AnyFn = (...args: any[]) => any;
const __: unique symbol; // exported from types.ts (follow-up 1)

interface CurryModule {
  curry(fn: AnyFn, arity?: number): AnyFn;
  pipe(...fns: AnyFn[]): AnyFn;
  compose(...fns: AnyFn[]): AnyFn;
  pipeAsync(...fns: AnyFn[]): (...args: any[]) => Promise<any>; // follow-up 2
}
```

## Test contract
- Tests call `curry`, `pipe` and `compose` as named exports of the module and spy on the wrapped functions with `vi.fn`.
- Base tests don't use the placeholder or `pipeAsync`.
- Follow-up 1 tests (`npm run test:followups -- s30`) pass `__` imported from `./types` as an argument to curried functions.
- Follow-up 2 tests call `pipeAsync` with a mix of sync functions and functions that return promises, and expect a rejected promise when a step throws or rejects.

## Edge cases
- `curry` of a function with default parameters: `((a, b = 2) => …).length === 1`.
- Currying a function that returns a function: the result must not be curried further.
- Reusing an intermediate: `const f1 = f(1); f1(2)(3); f1(4)(5)`.
- `pipe` with a single function behaves like that function.
- A step that returns `undefined` still feeds `undefined` into the next step.

## Follow-ups
1. **Placeholders.** Support `__` from `types.ts`. A placeholder reserves a position that later arguments fill, left to right: `f(__, 2)(1)(3)`, `f(__, __, 3)(1)(2)` and `f(1, __, 3)(2)` all call `fn(1, 2, 3)`. `fn` runs only when the first `arity` positions hold real values.
2. **Async pipe.** `pipeAsync(...fns)` returns a function that always returns a Promise. Each step may return a value or a promise; the next step receives the awaited value. A throw or rejection in any step rejects the result and stops later steps.
3. **Typing pipe.** Write TypeScript overloads (or a variadic tuple type) so `pipe(parseInt, (n: number) => n * 2, String)` is inferred as `(s: string) => string` and a mismatched step is a compile error.
4. **Where it matters in React.** Show a real use: composing HOCs (`compose(withRouter, withTheme)(Component)`), selector pipelines, or middleware. Why did hooks mostly replace HOC composition?
5. **Open-ended currying.** Implement `sum` so that `sum(1)(2)(3)()` returns `6` and `sum(1, 2)(3)()` also works. BFE #23 and Devtools.tech ask this. Then make `+sum(1)(2)(3)` work without the final call, using `valueOf` / `Symbol.toPrimitive`. What are the downsides of that trick?

## Concepts covered
Closures capturing argument lists · `Function.prototype.length` · partial application vs currying · `reduce` / `reduceRight` · promise chaining.

Related: J23 debounce · S31 memoize & LRU · S32 retry with backoff.
