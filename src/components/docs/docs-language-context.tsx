"use client";

import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from "react";

import type { CodeLanguage } from "./code-snippet-tabs";
import { CODE_LANG_ORDER } from "./code-snippet-tabs";

type DocsLanguageContextValue = {
  language: CodeLanguage | null;
  setLanguage: (language: CodeLanguage) => void;
  availableLanguages: readonly CodeLanguage[];
};

const DocsLanguageContext = createContext<DocsLanguageContextValue | null>(null);

type DocsLanguageProviderProps = {
  children: ReactNode;
  initialLanguage?: CodeLanguage;
};

export function DocsLanguageProvider({
  children,
  initialLanguage = "curl",
}: DocsLanguageProviderProps) {
  const [language, setLanguage] = useState<CodeLanguage | null>(initialLanguage);

  const updateLanguage = useCallback((next: CodeLanguage) => {
    setLanguage(next);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage: updateLanguage,
      availableLanguages: CODE_LANG_ORDER,
    }),
    [language, updateLanguage],
  );

  return <DocsLanguageContext.Provider value={value}>{children}</DocsLanguageContext.Provider>;
}

export function useDocsLanguage() {
  return useContext(DocsLanguageContext);
}
