import type { Messages } from './types';

/* Sample catalogs. English is the fallback locale; the others are deliberately incomplete. */

export const CATALOGS: Record<string, Messages> = {
  en: {
    'app.title': 'Team inbox',
    'app.greeting': 'Welcome back, {name}!',
    'inbox.count': '{count, plural, =0 {Your inbox is empty} one {You have # unread message} other {You have # unread messages}}',
    'files.shared': '{count, plural, one {{name} shared # file with you} other {{name} shared # files with you}}',
    'invoice.total': 'Total due: {amount}',
    'invoice.date': 'Issued on {date}',
    'settings.language': 'Language',
    'footer.legal': 'All prices include VAT.',
  },
  fr: {
    'app.title': 'Boîte de réception',
    'app.greeting': 'Bon retour, {name} !',
    'inbox.count': '{count, plural, =0 {Votre boîte est vide} one {Vous avez # message non lu} other {Vous avez # messages non lus}}',
    'files.shared': '{count, plural, one {{name} a partagé # fichier avec vous} other {{name} a partagé # fichiers avec vous}}',
    'invoice.total': 'Total dû : {amount}',
    'invoice.date': 'Émise le {date}',
    'settings.language': 'Langue',
    // 'footer.legal' intentionally missing → falls back to English
  },
  ar: {
    'app.title': 'صندوق الوارد',
    'app.greeting': 'مرحبًا بعودتك يا {name}!',
    'inbox.count':
      '{count, plural, =0 {صندوقك فارغ} zero {لا توجد رسائل} one {لديك رسالة واحدة} two {لديك رسالتان} few {لديك # رسائل} many {لديك # رسالة} other {لديك # رسالة}}',
    'invoice.total': 'المبلغ المستحق: {amount}',
    'settings.language': 'اللغة',
  },
  de: {
    'app.title': 'Posteingang',
    'app.greeting': 'Willkommen zurück, {name}!',
    'inbox.count': '{count, plural, =0 {Ihr Posteingang ist leer} one {Sie haben # ungelesene Nachricht} other {Sie haben # ungelesene Nachrichten}}',
    'settings.language': 'Sprache',
  },
};

export const LOCALE_LABELS: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
  de: 'Deutsch',
};

/** Simulates fetching /locales/<locale>.json. Unknown locales reject. */
export function loadMessages(locale: string, latencyMs = 700): Promise<Messages> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const catalog = CATALOGS[locale];
      if (catalog) resolve(structuredClone(catalog));
      else reject(new Error(`No catalog for locale "${locale}"`));
    }, latencyMs);
  });
}
