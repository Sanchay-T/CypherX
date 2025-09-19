"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useDocsLanguage } from "./docs-language-context";

export function LanguageSelect() {
  const docsLanguage = useDocsLanguage();

  if (!docsLanguage) {
    return null;
  }

  const { language, setLanguage, availableLanguages } = docsLanguage;
  const selectValue = language ?? availableLanguages[0];

  return (
    <Select value={selectValue} onValueChange={(value) => setLanguage(value as (typeof availableLanguages)[number])}>
      <SelectTrigger className="w-full sm:w-[160px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        {availableLanguages.map((lang) => (
          <SelectItem key={lang} value={lang} className="capitalize">
            {lang}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
