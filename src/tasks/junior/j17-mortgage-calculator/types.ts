export interface MortgageCalculatorProps {
  /** ISO 4217 currency code used to format results. Default 'USD'. */
  currency?: string;
  /** BCP 47 locale used to format results. Default 'en-US'. */
  locale?: string;
}

/** The numbers the calculator displays, before formatting. */
export interface MortgageResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
}
