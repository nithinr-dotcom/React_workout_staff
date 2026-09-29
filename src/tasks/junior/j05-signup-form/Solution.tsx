import type { SignupFormProps, SignupValues } from "./types";
import styles from "./Solution.module.css";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type Field = keyof SignupValues;
type Errors = Partial<Record<Field, string>>;

// Order matters: it's the visual order, used to focus the FIRST invalid field.
const FIELDS: { name: Field; label: string; type: string; autoComplete: string }[] = [
  { name: "name", label: "Name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "password", label: "Password", type: "password", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirm password", type: "password", autoComplete: "new-password" },
];

const EMPTY: SignupValues = { name: "", email: "", password: "", confirmPassword: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1. VALIDATION is a pure function: values in → errors out.
//    No state, no timing. That makes it easy to call on blur, on change and on submit.
function validate(v: SignupValues): Errors {
  const errors: Errors = {};
  const email = v.email.trim();

  if (!v.name.trim()) errors.name = "Name is required";

  if (!email) errors.email = "Email is required";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address";

  // Passwords are never trimmed: a space is a valid password character.
  if (!v.password) errors.password = "Password is required";
  else if (v.password.length < 8) errors.password = "Password must be at least 8 characters";

  if (!v.confirmPassword) errors.confirmPassword = "Please confirm your password";
  else if (v.confirmPassword !== v.password) errors.confirmPassword = "Passwords do not match";

  return errors;
}

export default function SignupForm({ onSubmit }: SignupFormProps) {
  const [values, setValues] = useState<SignupValues>(EMPTY);
  // 2. TOUCHED: which fields may show their error. A field becomes touched on
  //    its first blur, and every field becomes touched on a submit attempt.
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [serverError, setServerError] = useState<string | null>(null);
  const [welcomeName, setWelcomeName] = useState("");

  const baseId = useId();
  const inputRefs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  // 3. DOUBLE-SUBMIT GUARD. State updates are async, so two quick Enters could both
  //    see status === "idle". A ref changes immediately, so the second one is blocked.
  const submittingRef = useRef(false);

  // Don't update state if the form unmounts while onSubmit is still pending.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Errors are DERIVED from values on every render, so they update as the user
  // types, and disappear as soon as the field is fixed. Nothing to keep in sync.
  const errors = validate(values);
  const visibleError = (f: Field) => (touched[f] ? errors[f] : undefined);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // stop the browser's full-page form submit
    if (submittingRef.current) return;

    // Show every error from now on.
    setTouched({ name: true, email: true, password: true, confirmPassword: true });

    const firstInvalid = FIELDS.find((f) => errors[f.name]);
    if (firstInvalid) {
      inputRefs.current[firstInvalid.name]?.focus();
      return;
    }

    const payload: SignupValues = {
      ...values,
      name: values.name.trim(),
      email: values.email.trim(),
    };

    submittingRef.current = true;
    setStatus("submitting");
    setServerError(null);

    try {
      await onSubmit(payload);
      if (!mountedRef.current) return;
      setWelcomeName(payload.name);
      setStatus("success");
    } catch (err) {
      if (!mountedRef.current) return;
      // Keep all values so the user can just fix things and retry.
      setServerError(err instanceof Error && err.message ? err.message : "Something went wrong");
      setStatus("idle");
    } finally {
      submittingRef.current = false;
    }
  };

  // 4. SUCCESS replaces the form.
  if (status === "success") {
    return <p className={styles.success}>Welcome, {welcomeName}!</p>;
  }

  const submitting = status === "submitting";

  return (
    // noValidate: turn off the browser's own validation bubbles, we show our own messages.
    <form className={styles.root} noValidate onSubmit={handleSubmit}>
      {FIELDS.map((f) => {
        const inputId = `${baseId}-${f.name}`;
        const errorId = `${baseId}-${f.name}-error`;
        const error = visibleError(f.name);
        return (
          <div key={f.name} className={styles.field}>
            <label htmlFor={inputId} className={styles.label}>
              {f.label}
            </label>
            <input
              ref={(el) => {
                inputRefs.current[f.name] = el;
              }}
              id={inputId}
              name={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              value={values[f.name]}
              onChange={(e) => {
                const next = e.target.value;
                setValues((prev) => ({ ...prev, [f.name]: next }));
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, [f.name]: true }))}
              // 5. ARIA: mark the field invalid and point at its message, so a
              //    screen reader reads "Email, invalid, Enter a valid email address".
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={`${styles.input} ${error ? styles.inputInvalid : ""}`}
            />
            {error && (
              <p id={errorId} className={styles.error}>
                {error}
              </p>
            )}
          </div>
        );
      })}

      {serverError && (
        <p role="alert" className={styles.serverError}>
          {serverError}
        </p>
      )}

      <button type="submit" className={styles.submit} disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
