export interface SignupValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignupFormProps {
  /**
   * Called with the (trimmed name/email) values once every field is valid.
   * Resolve = account created. Reject with an Error = show error.message.
   */
  onSubmit: (values: SignupValues) => Promise<void>;
}
