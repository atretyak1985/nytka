"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const emptySubscribe = () => () => {};

/** false during SSR + initial hydration, true afterwards — avoids a theme mismatch. */
function useHydrated() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title="Toggle theme"
      aria-label={hydrated ? (isDark ? "Switch to light theme" : "Switch to dark theme") : "Toggle theme"}
      className="flex size-[30px] items-center justify-center rounded-[7px] border border-bb-line bg-transparent text-bb-ink-2 transition-colors hover:bg-bb-surface-2 hover:text-bb-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-bb-brand"
    >
      {hydrated && isDark ? (
        <Sun className="size-[15px]" strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Moon className="size-[15px]" strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}
