import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react';
import type { OtpInputProps } from './types';
import styles from './Reference.module.css';

const isDigit = (char: string | undefined) => char !== undefined && /^\d$/.test(char);

export default function OtpInput({ length = 6, onComplete, onChange, autoFocus = false, disabled = false }: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(() => Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resize (keeping existing digits) when `length` changes, during render rather than in an effect.
  if (digits.length !== length) {
    setDigits(Array.from({ length }, (_, i) => digits[i] ?? ''));
  }

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
  }, [autoFocus]);

  const focusBox = (index: number) => {
    const clamped = Math.max(0, Math.min(length - 1, index));
    inputRefs.current[clamped]?.focus();
  };

  // Single place that applies a change and notifies the parent. Called from event handlers,
  // so callbacks run once per user action (no effect double-firing in StrictMode).
  const commit = (next: string[]) => {
    const changed = next.some((d, i) => d !== digits[i]);
    if (!changed) return;
    setDigits(next);
    onChange?.(next);
    if (next.every((d) => d !== '')) onComplete?.(next.join(''));
  };

  const fillFrom = (start: number, incoming: string) => {
    const onlyDigits = incoming.replace(/\D/g, '');
    if (!onlyDigits) return;
    const next = [...digits];
    let i = start;
    for (const char of onlyDigits) {
      if (i >= length) break;
      next[i] = char;
      i++;
    }
    commit(next);
    focusBox(i);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const raw = event.target.value;
    const previous = digits[index];

    if (raw === '') {
      commit(digits.map((d, i) => (i === index ? '' : d)));
      return;
    }

    let typed: string | undefined;
    if (raw.length === 1) {
      typed = raw;
    } else if (raw.length === 2 && previous !== '') {
      // Typed into a filled box: the new character sits just before the caret.
      const caret = event.target.selectionStart;
      typed = caret ? raw[caret - 1] : raw[raw.length - 1];
      if (typed === previous && raw[0] !== raw[1]) typed = raw.replace(previous, '');
    } else {
      // Several characters at once: OS autofill or an input method that bypasses paste.
      fillFrom(index, previous && raw.startsWith(previous) ? raw.slice(previous.length) : raw);
      return;
    }

    if (!isDigit(typed)) return; // ignore letters/symbols: state is unchanged, React restores the value
    commit(digits.map((d, i) => (i === index ? typed : d)));
    focusBox(index + 1);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    switch (event.key) {
      case 'Backspace': {
        event.preventDefault();
        if (digits[index] !== '') {
          commit(digits.map((d, i) => (i === index ? '' : d)));
        } else if (index > 0) {
          commit(digits.map((d, i) => (i === index - 1 ? '' : d)));
          focusBox(index - 1);
        }
        break;
      }
      case 'Delete':
        event.preventDefault();
        commit(digits.map((d, i) => (i === index ? '' : d)));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusBox(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        focusBox(index + 1);
        break;
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>, index: number) => {
    event.preventDefault();
    fillFrom(index, event.clipboardData.getData('text'));
  };

  return (
    <div role="group" aria-label="One-time code" className={styles.group}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          className={styles.box}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${index + 1} of ${length}`}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onPaste={(e) => handlePaste(e, index)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}
