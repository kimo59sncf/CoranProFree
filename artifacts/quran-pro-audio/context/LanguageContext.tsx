import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import { getDeviceLanguage, t as translate, type Language } from '@/lib/i18n';

const LANGUAGE_KEY = '@coranprofree/language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  rtl: boolean;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function applyDirection(lang: Language) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(lang === 'ar');
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LANGUAGE_KEY)
      .then((stored) => {
        if (!active) return;
        const initial = stored === 'fr' || stored === 'en' || stored === 'ar' ? stored : getDeviceLanguage();
        setLanguageState(initial);
        applyDirection(initial);
      })
      .catch(() => {
        if (!active) return;
        const initial = getDeviceLanguage();
        setLanguageState(initial);
        applyDirection(initial);
      });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    applyDirection(lang);
    AsyncStorage.setItem(LANGUAGE_KEY, lang).catch(() => {});
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage,
      t: (key: string) => translate(language, key),
      rtl: language === 'ar',
    }),
    [language, setLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
