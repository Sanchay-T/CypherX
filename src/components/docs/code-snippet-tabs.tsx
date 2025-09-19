"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useDocsLanguage } from "./docs-language-context";

export const CODE_LANG_ORDER = ["curl", "node", "python", "go", "java"] as const;

export type CodeLanguage = (typeof CODE_LANG_ORDER)[number];

type CodeSnippetTabsProps = {
  snippets: Partial<Record<CodeLanguage, string>>;
  initialLanguage?: CodeLanguage;
  filename?: string;
  className?: string;
};

export function CodeSnippetTabs({
  snippets,
  initialLanguage = "curl",
  filename,
  className,
}: CodeSnippetTabsProps) {
  const docsLanguage = useDocsLanguage();

  const available = useMemo(() => CODE_LANG_ORDER.filter((lang) => snippets[lang]), [snippets]);

  const firstLanguage = available[0] ?? initialLanguage;
  const [current, setCurrent] = useState<CodeLanguage>(firstLanguage);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!docsLanguage) return;
    const preferred = docsLanguage.language;
    if (preferred && available.includes(preferred) && preferred !== current) {
      setCurrent(preferred);
    }
  }, [docsLanguage, current, available]);

  const handleCopy = async () => {
    const content = snippets[current];
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy snippet", error);
    }
  };

  if (available.length === 0) {
    return null;
  }

  const handleTabChange = (value: string) => {
    const language = value as CodeLanguage;
    setCurrent(language);
    docsLanguage?.setLanguage(language);
  };

  return (
    <Tabs
      value={current}
      onValueChange={handleTabChange}
      className={cn("w-full overflow-hidden rounded-xl border border-border/70 bg-card text-card-foreground shadow", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/10 px-4 py-2">
        <TabsList className="h-auto bg-transparent p-0">
          {available.map((lang) => (
            <TabsTrigger
              key={lang}
              value={lang}
              className="rounded-md px-3 py-1.5 text-xs capitalize data-[state=active]:bg-muted/40 data-[state=active]:text-foreground"
            >
              {lang}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {filename ? <span className="hidden md:inline">{filename}</span> : null}
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={handleCopy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>
      {available.map((lang) => (
        <TabsContent key={lang} value={lang} className="m-0">
          <pre className="max-h-[360px] min-h-[180px] w-full overflow-auto bg-background px-4 py-4 text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">
            {snippets[lang]}
          </pre>
        </TabsContent>
      ))}
    </Tabs>
  );
}
