/** Follow-up 1: a function called for every key/value pair, or an allow-list of property names. */
export type Replacer = ((this: any, key: string, value: any) => any) | (string | number)[] | null;

/** Follow-up 2: called bottom-up for every key/value pair after parsing. */
export type Reviver = (this: any, key: string, value: any) => any;

export interface JsonModule {
  /**
   * Same output as `JSON.stringify(value)`. Returns `undefined` when the top-level value
   * is `undefined`, a function or a symbol.
   * `replacer` and `space` are follow-up 1.
   */
  stringify(value: unknown, replacer?: Replacer, space?: string | number): string | undefined;

  /**
   * Same result as `JSON.parse(text)`. Throws a `SyntaxError` for invalid JSON.
   * `reviver` is follow-up 2.
   */
  parse(text: string, reviver?: Reviver): unknown;
}
