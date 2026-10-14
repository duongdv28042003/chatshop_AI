"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 rounded-xl border-border/40 bg-card/60"
        aria-label="Đổi nền đen trắng"
      >
        <span className="w-4 h-4" />
      </Button>
    );
  }

  const isDark = (theme || resolvedTheme) === "dark";

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-8 px-2.5 gap-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-xs font-medium text-neutral-900 dark:text-neutral-100 shadow-sm"
      title={isDark ? "Chuyển sang nền sáng (Trắng)" : "Chuyển sang nền tối (Đen)"}
      aria-label="Chuyển đổi giao diện sáng tối"
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-500 transition-transform hover:rotate-90" />
          <span className="hidden sm:inline text-xs font-mono">Sáng</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-neutral-600 transition-transform hover:-rotate-12" />
          <span className="hidden sm:inline text-xs font-mono">Tối</span>
        </>
      )}
    </Button>
  );
}
