import type { FormWizardProps, WizardData, WizardStep } from "./types";
import styles from "./Solution.module.css";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

type Field = keyof WizardData;
type Errors = Partial<Record<Field, string>>;

const STEPS: { id: WizardStep; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "profile", label: "Profile" },
  { id: "review", label: "Review" },
];

const EMPTY: WizardData = { email: "", password: "", fullName: "", jobTitle: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1. VALIDATION is a pure function: (step, values) in → errors for THAT step out.
//    Next only checks the current step, so Profile never complains about Account.
//    It runs fresh on every Next, so nothing is cached between visits.
function validateStep(step: WizardStep, v: WizardData): Errors {
  const errors: Errors = {};
  if (step === "account") {
    if (!v.email) errors.email = "Email is required";
    else if (!EMAIL_RE.test(v.email)) errors.email = "Enter a valid email address";
    // Passwords are never trimmed: a space is a valid password character.
    if (v.password.length < 8) errors.password = "Password must be at least 8 characters";
  }
  if (step === "profile") {
    if (!v.fullName.trim()) errors.fullName = "Full name is required";
  }
  return errors;
}

export default function FormWizard({ onSubmit }: FormWizardProps) {
  // 2. STATE: ONE object holds the data for every step, and it lives here in the
  //    parent. Steps unmount when we move on, but their values survive because
  //    the inputs are controlled from this single source of truth.
  const [values, setValues] = useState<WizardData>(EMPTY);
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");

  const baseId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRefs = useRef<Partial<Record<Field, HTMLInputElement | null>>>({});

  // 3. DOUBLE-SUBMIT GUARD. A ref changes immediately, unlike state, so a second
  //    quick click can't slip through before the re-render disables the button.
  const submittingRef = useRef(false);

  // 4. FOCUS ON STEP CHANGE. We only move focus when the user changed step
  //    (not on first load, which would steal focus from the page). A flag set by
  //    goTo() is safer than "skip the first render", which StrictMode breaks.
  const focusHeadingRef = useRef(false);
  useEffect(() => {
    if (!focusHeadingRef.current) return;
    focusHeadingRef.current = false;
    headingRef.current?.focus();
  }, [stepIndex]);

  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const step = STEPS[stepIndex];
  const submitting = status === "submitting";

  const goTo = (index: number) => {
    focusHeadingRef.current = true;
    setErrors({}); // errors belong to the step we are leaving
    setStepIndex(index);
  };

  const setField = (name: Field, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Editing a field clears ONLY its own error; the others stay until fixed.
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  // 5. ONE <form> for all steps, so Enter in any field submits it.
  //    On Account/Profile that means "Next"; on Review it means "Submit".
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (step.id !== "review") {
      const found = validateStep(step.id, values);
      const firstInvalid = (Object.keys(values) as Field[]).find((f) => found[f]);
      if (firstInvalid) {
        setErrors(found);
        inputRefs.current[firstInvalid]?.focus();
        return;
      }
      // Use stepIndex from this render (not prev => prev + 1): two quick clicks
      // both ask for the same next step, so a step can never be skipped.
      goTo(stepIndex + 1);
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setStatus("submitting");
    try {
      await onSubmit({
        ...values,
        fullName: values.fullName.trim(),
        jobTitle: values.jobTitle.trim(),
      });
      if (mountedRef.current) setStatus("success");
    } catch {
      // Error display is a follow-up. For now just re-enable the buttons so a retry works.
      if (mountedRef.current) setStatus("idle");
    } finally {
      submittingRef.current = false;
    }
  };

  // 6. SUCCESS replaces the whole wizard. role="status" makes screen readers announce it.
  if (status === "success") {
    return (
      <p role="status" className={styles.success}>
        Account created
      </p>
    );
  }

  const renderInput = (
    name: Field,
    label: string,
    type: string,
    autoComplete: string,
    hint?: string,
  ) => {
    const inputId = `${baseId}-${name}`;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;
    const error = errors[name];
    // 7. ARIA: link the hint and the error to the input, so a screen reader reads
    //    "Email, invalid, Email is required". The label stays exactly "Email".
    const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ");
    return (
      <div className={styles.field}>
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
        {hint && (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        )}
        <input
          ref={(el) => {
            inputRefs.current[name] = el;
          }}
          id={inputId}
          name={name}
          type={type}
          autoComplete={autoComplete}
          value={values[name]}
          onChange={(e) => setField(name, e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={`${styles.input} ${error ? styles.inputInvalid : ""}`}
        />
        {error && (
          <p id={errorId} className={styles.error}>
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className={styles.root}>
      {/* 8. INDICATOR: an <ol> because order matters; aria-current marks where we are. */}
      <ol aria-label="Progress" className={styles.steps}>
        {STEPS.map((s, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "upcoming";
          return (
            <li
              key={s.id}
              aria-current={state === "current" ? "step" : undefined}
              className={`${styles.step} ${styles[state]}`}
            >
              <span className={styles.stepNumber} aria-hidden="true">
                {state === "done" ? "✓" : i + 1}
              </span>
              {s.label}
              {state === "done" && <span className={styles.srOnly}> (completed)</span>}
            </li>
          );
        })}
      </ol>

      {/* noValidate: we show our own messages instead of the browser's bubbles. */}
      <form noValidate onSubmit={handleSubmit} className={styles.form}>
        {/* tabIndex={-1}: focusable from code, but not a Tab stop. */}
        <h2 ref={headingRef} tabIndex={-1} className={styles.heading}>
          {step.label}
        </h2>

        {step.id === "account" && (
          <>
            {renderInput("email", "Email", "email", "email")}
            {renderInput("password", "Password", "password", "new-password")}
          </>
        )}

        {step.id === "profile" && (
          <>
            {renderInput("fullName", "Full name", "text", "name")}
            {renderInput("jobTitle", "Job title", "text", "organization-title", "Optional")}
          </>
        )}

        {step.id === "review" && (
          // A description list: term/value pairs, each value its own element.
          <dl className={styles.summary}>
            <dt>Email</dt>
            <dd>{values.email}</dd>
            <dt>Password</dt>
            {/* Fixed-length mask: never show the password, not even its length. */}
            <dd>
              <span aria-hidden="true">••••••••</span>
              <span className={styles.srOnly}>Hidden</span>
            </dd>
            <dt>Full name</dt>
            <dd>{values.fullName.trim()}</dd>
            <dt>Job title</dt>
            <dd>{values.jobTitle.trim() || "Not provided"}</dd>
          </dl>
        )}

        <div className={styles.actions}>
          {/* type="button": Back must never submit the form (or validate). */}
          <button
            type="button"
            className={styles.secondary}
            onClick={() => goTo(stepIndex - 1)}
            disabled={stepIndex === 0 || submitting}
          >
            Back
          </button>
          <button type="submit" className={styles.primary} disabled={submitting}>
            {step.id === "review" ? "Submit" : "Next"}
          </button>
        </div>
      </form>
    </div>
  );
}
