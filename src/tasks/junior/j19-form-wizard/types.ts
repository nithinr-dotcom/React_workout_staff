export interface WizardData {
  email: string;
  password: string;
  fullName: string;
  /** Optional; empty string when not provided. */
  jobTitle: string;
}

export type WizardStep = 'account' | 'profile' | 'review';

export interface FormWizardProps {
  /** Called once with all collected data when the user submits on the Review step. */
  onSubmit: (data: WizardData) => void | Promise<void>;
}
