// ⚠ Unverified: written before the reference solution. If a test looks wrong, trust the README.
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { pickTarget } from '../../../test/target';
import * as Reference from './Reference';
import * as Solution from './Solution';
import type { I18n, Messages } from './types';

const { impl, describeTask } = pickTarget(Solution, Reference);

afterEach(() => {
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('lang');
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const EN: Messages = {
  greeting: 'Hello, {name}!',
  inbox: '{count, plural, =0 {No messages} one {# message} other {# messages}}',
  onlyEn: 'Only in English',
};
const FR: Messages = {
  greeting: 'Bonjour, {name} !',
  inbox: '{count, plural, =0 {Aucun message} one {# message} other {# messages}}',
};
const AR: Messages = { greeting: 'مرحبا {name}' };

function Demo() {
  const t = impl.useT();
  const { locale, isLoading, dir, setLocale, formatNumber, formatDate } = impl.useI18n();
  const date = new Date(Date.UTC(2024, 0, 15));
  return (
    <div>
      <p>{t('greeting', { name: 'Ada' })}</p>
      <p>Locale: {locale}</p>
      <p>Dir: {dir}</p>
      {isLoading && <p>Switching…</p>}
      <p>Number: {formatNumber(1234567.891)}</p>
      <p>Date: {formatDate(date, { timeZone: 'UTC', dateStyle: 'long' })}</p>
      <button onClick={() => void setLocale('en')}>English</button>
      <button onClick={() => void setLocale('fr')}>French</button>
      <button onClick={() => void setLocale('ar')}>Arabic</button>
      <button onClick={() => void setLocale('de')}>German</button>
    </div>
  );
}

function renderWith(i18n: I18n) {
  return render(
    <impl.I18nProvider i18n={i18n} fallback={<p>Loading…</p>}>
      <Demo />
    </impl.I18nProvider>,
  );
}

describeTask('formatMessage', () => {
  it('interpolates params and leaves unknown placeholders intact', () => {
    expect(impl.formatMessage('Hello, {name}! You have {count} tasks.', { name: 'Ada', count: 3 }, 'en')).toBe(
      'Hello, Ada! You have 3 tasks.',
    );
    expect(impl.formatMessage('Hi {name}, {missing}', { name: 'Ada' }, 'en')).toBe('Hi Ada, {missing}');
    expect(impl.formatMessage('Plain text', undefined, 'en')).toBe('Plain text');
  });

  it('selects plural branches: exact match, then Intl.PluralRules category, then other', () => {
    const msg = EN.inbox;
    expect(impl.formatMessage(msg, { count: 0 }, 'en')).toBe('No messages');
    expect(impl.formatMessage(msg, { count: 1 }, 'en')).toBe('1 message');
    expect(impl.formatMessage(msg, { count: 5 }, 'en')).toBe('5 messages');
    expect(impl.formatMessage(msg, { count: 1200 }, 'en')).toBe(`${new Intl.NumberFormat('en').format(1200)} messages`);
    expect(impl.formatMessage('{n, plural, other {# things}}', { n: 1 }, 'en')).toBe('1 things');
  });

  it('interpolates nested placeholders inside a plural branch', () => {
    const msg = '{count, plural, one {{name} has # file} other {{name} has # files}}';
    expect(impl.formatMessage(msg, { count: 1, name: 'Ada' }, 'en')).toBe('Ada has 1 file');
    expect(impl.formatMessage(msg, { count: 2, name: 'Ada' }, 'en')).toBe('Ada has 2 files');
  });

  it('uses the locale plural rules (Arabic has more than two forms)', () => {
    const msg = '{n, plural, zero {zero} one {one} two {two} few {few} many {many} other {other}}';
    const rules = new Intl.PluralRules('ar');
    for (const n of [1, 2, 3, 11, 100]) {
      expect(impl.formatMessage(msg, { n }, 'ar')).toBe(rules.select(n));
    }
  });
});

describeTask('i18n runtime + React bindings', () => {
  it('renders the fallback until the initial catalog loads, then the translation', async () => {
    const en = deferred<Messages>();
    const loadMessages = vi.fn((locale: string) => (locale === 'en' ? en.promise : Promise.resolve({})));
    const i18n = impl.createI18n({ locale: 'en', fallbackLocale: 'en', loadMessages });
    renderWith(i18n);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(loadMessages).toHaveBeenCalledTimes(1);
    expect(loadMessages).toHaveBeenCalledWith('en');

    await act(async () => {
      en.resolve(EN);
    });
    expect(await screen.findByText('Hello, Ada!')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
  });

  it('renders preloaded messages on the very first render without calling loadMessages', () => {
    const loadMessages = vi.fn(() => Promise.resolve({}));
    const i18n = impl.createI18n({ locale: 'en', fallbackLocale: 'en', loadMessages, messages: { en: EN } });
    renderWith(i18n);
    expect(screen.getByText('Hello, Ada!')).toBeInTheDocument();
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
    expect(loadMessages).not.toHaveBeenCalled();
  });

  it('falls back to the fallback locale, then to the key, reporting missing keys', () => {
    const onMissingKey = vi.fn();
    const i18n = impl.createI18n({
      locale: 'fr',
      fallbackLocale: 'en',
      loadMessages: vi.fn(() => Promise.resolve({})),
      messages: { en: EN, fr: FR },
      onMissingKey,
    });
    function Keys() {
      const t = impl.useT();
      return (
        <>
          <p>{t('greeting', { name: 'Ada' })}</p>
          <p>{t('onlyEn')}</p>
          <p>{t('nowhere.to.be.found')}</p>
        </>
      );
    }
    render(
      <impl.I18nProvider i18n={i18n}>
        <Keys />
      </impl.I18nProvider>,
    );
    expect(screen.getByText('Bonjour, Ada !')).toBeInTheDocument();
    expect(screen.getByText('Only in English')).toBeInTheDocument();
    expect(screen.getByText('nowhere.to.be.found')).toBeInTheDocument();
    expect(onMissingKey).toHaveBeenCalledWith('onlyEn', 'fr');
    expect(onMissingKey).toHaveBeenCalledWith('nowhere.to.be.found', 'fr');
    expect(onMissingKey).not.toHaveBeenCalledWith('greeting', expect.anything());
  });

  it('lazy-loads a new locale, keeps the previous one on screen meanwhile, and caches catalogs', async () => {
    const user = userEvent.setup();
    const fr = deferred<Messages>();
    const loadMessages = vi.fn((locale: string) => (locale === 'fr' ? fr.promise : Promise.resolve(EN)));
    const i18n = impl.createI18n({ locale: 'en', fallbackLocale: 'en', loadMessages, messages: { en: EN } });
    renderWith(i18n);

    await user.click(screen.getByRole('button', { name: 'French' }));
    expect(loadMessages).toHaveBeenCalledWith('fr');
    expect(screen.getByText('Hello, Ada!')).toBeInTheDocument();
    expect(await screen.findByText('Switching…')).toBeInTheDocument();

    await act(async () => {
      fr.resolve(FR);
    });
    expect(await screen.findByText('Bonjour, Ada !')).toBeInTheDocument();
    expect(screen.queryByText('Switching…')).not.toBeInTheDocument();
    expect(i18n.getLocale()).toBe('fr');

    await user.click(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByText('Hello, Ada!')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'French' }));
    expect(await screen.findByText('Bonjour, Ada !')).toBeInTheDocument();
    expect(loadMessages).toHaveBeenCalledTimes(1);
  });

  it('sets lang/dir on the document element and switches to rtl for Arabic', async () => {
    const user = userEvent.setup();
    const i18n = impl.createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      loadMessages: vi.fn(() => Promise.resolve({})),
      messages: { en: EN, ar: AR },
    });
    renderWith(i18n);
    await waitFor(() => expect(document.documentElement.getAttribute('dir')).toBe('ltr'));
    expect(document.documentElement.getAttribute('lang')).toBe('en');

    await user.click(screen.getByRole('button', { name: 'Arabic' }));
    await waitFor(() => expect(document.documentElement.getAttribute('dir')).toBe('rtl'));
    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(screen.getByText('Dir: rtl')).toBeInTheDocument();
    expect(screen.getByText('مرحبا Ada')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'English' }));
    await waitFor(() => expect(document.documentElement.getAttribute('dir')).toBe('ltr'));
  });

  it('formats numbers and dates with Intl for the active locale', async () => {
    const user = userEvent.setup();
    const i18n = impl.createI18n({
      locale: 'en',
      fallbackLocale: 'en',
      loadMessages: vi.fn(() => Promise.resolve({})),
      messages: { en: EN, de: {} },
    });
    renderWith(i18n);
    const dateOpts: Intl.DateTimeFormatOptions = { timeZone: 'UTC', dateStyle: 'long' };
    const date = new Date(Date.UTC(2024, 0, 15));
    expect(screen.getByText(`Number: ${new Intl.NumberFormat('en').format(1234567.891)}`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'German' }));
    expect(await screen.findByText(`Number: ${new Intl.NumberFormat('de').format(1234567.891)}`)).toBeInTheDocument();
    expect(screen.getByText(`Date: ${new Intl.DateTimeFormat('de', dateOpts).format(date)}`)).toBeInTheDocument();
    // "de" has no greeting: falls back to English
    expect(screen.getByText('Hello, Ada!')).toBeInTheDocument();
  });
});
