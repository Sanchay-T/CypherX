"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  const isDark = theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className="h-9 w-9"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <SunMedium className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonStar className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
