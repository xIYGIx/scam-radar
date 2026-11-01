"use client";

import { createContext, useContext, useState, useEffect } from "react";

type Language = "ar" | "en";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  isAr: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ar",
  setLang: () => {},
  isAr: true,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>("ar");

  useEffect(() => {
    const saved = localStorage.getItem("scam_radar_lang") as Language;
    if (saved) setLang(saved);
  }, []);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("scam_radar_lang", newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, isAr: lang === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);