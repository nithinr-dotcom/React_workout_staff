export type Operator = '+' | '-' | '*' | '/';

export interface CalculatorProps {
  /**
   * Follow-up 1: when true, `=` evaluates the whole typed expression with normal
   * operator precedence (× and ÷ before + and −). Default false: immediate execution, left to right.
   */
  precedence?: boolean;
}
