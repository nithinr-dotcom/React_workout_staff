import { Component, useState, type ReactNode } from 'react';
import { LOCALE_LABELS, loadMessages } from './data';
import type { I18n, I18nModule } from './types';

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <p style={{ color: '#b91c1c' }}>Error: {this.state.error.message}</p>;
    return this.props.children;
  }
}

function Demo({ impl }: { impl: I18nModule }) {
  const t = impl.useT();
  const { locale, isLoading, dir, setLocale, formatNumber, formatDate } = impl.useI18n();
  const [count, setCount] = useState(1);
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <h3 style={{ margin: 0 }}>{t('app.title')}</h3>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {t('settings.language')}
        <select
          value={locale}
          onChange={(e) => {
            setError(null);
            setLocale(e.target.value).catch((err: Error) => setError(err.message));
          }}
        >
          {Object.entries(LOCALE_LABELS).map(([code, label]) => (
            <option key={code} value={code} lang={code}>
              {label}
            </option>
          ))}
          <option value="xx">Broken locale (rejects)</option>
        </select>
        {isLoading && <span>Switching…</span>}
      </label>
      {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
      <p>{t('app.greeting', { name: 'Priya' })}</p>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        count
        <input type="number" min={0} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 80 }} />
      </label>
      <p>{t('inbox.count', { count })}</p>
      <p>{t('files.shared', { count, name: 'Ben' })}</p>
      <p>{t('invoice.total', { amount: formatNumber(1234.5, { style: 'currency', currency: 'EUR' }) })}</p>
      <p>{t('invoice.date', { date: formatDate(new Date(), { dateStyle: 'long' }) })}</p>
      <p style={{ paddingInlineStart: 16, borderInlineStart: '3px solid #4f46e5' }}>{t('footer.legal')}</p>
      <p style={{ color: '#667085', fontSize: 13 }}>
        locale={locale} · dir={dir} · missing: {t('does.not.exist')}
      </p>
    </div>
  );
}

export default function Playground({ impl }: { impl: I18nModule }) {
  const [state] = useState<{ i18n: I18n | null; error: string | null }>(() => {
    try {
      return { i18n: impl.createI18n({ locale: 'en', fallbackLocale: 'en', loadMessages: (l) => loadMessages(l) }), error: null };
    } catch (e) {
      return { i18n: null, error: (e as Error).message };
    }
  });
  const Provider = impl.I18nProvider;

  if (!state.i18n) return <p style={{ color: '#b91c1c' }}>Error: {state.error}</p>;
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 560 }}>
      <Boundary>
        <Provider i18n={state.i18n} fallback={<p>Loading translations…</p>}>
          <Demo impl={impl} />
        </Provider>
      </Boundary>
    </div>
  );
}
