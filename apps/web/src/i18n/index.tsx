'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import fr from './fr.json';
import en from './en.json';
import ar from './ar.json';

export type Locale = 'fr' | 'en' | 'ar';

const dictionaries: Record<Locale, any> = {
  fr,
  en,
  ar,
};

interface I18nContextType {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  isRtl: boolean;
  t: (keyPath: string) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string | Date | null | undefined) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'fr',
  setLocale: () => {},
  isRtl: false,
  t: (k) => k,
  formatCurrency: (amt) => `${amt} DH`,
  formatDate: (d) => String(d || ''),
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr');

  useEffect(() => {
    const saved = localStorage.getItem('proorga_lang') as Locale | null;
    if (saved && ['fr', 'en', 'ar'].includes(saved)) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('proorga_lang', newLocale);
  };

  const isRtl = locale === 'ar';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [locale, isRtl]);

  const t = (keyPath: string): string => {
    const keys = keyPath.split('.');
    let current = dictionaries[locale];
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        // Fallback to French
        let fallback = dictionaries.fr;
        for (const fk of keys) {
          if (fallback && typeof fallback === 'object' && fk in fallback) {
            fallback = fallback[fk];
          } else {
            return keyPath;
          }
        }
        return typeof fallback === 'string' ? fallback : keyPath;
      }
    }
    return typeof current === 'string' ? current : keyPath;
  };

  const formatCurrency = (amount: number): string => {
    if (locale === 'ar') {
      return `${amount.toLocaleString('ar-MA')} د.م.`;
    }
    if (locale === 'en') {
      return `${amount.toLocaleString('en-US')} MAD`;
    }
    return `${amount.toLocaleString('fr-FR')} DH`;
  };

  const formatDate = (dateInput: string | Date | null | undefined): string => {
    if (!dateInput) return '—';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return '—';

    const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-US' : 'fr-FR';
    return new Intl.DateTimeFormat(localeCode, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        isRtl,
        t,
        formatCurrency,
        formatDate,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export const useTranslation = () => useContext(I18nContext);
