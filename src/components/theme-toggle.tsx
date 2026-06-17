"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "sportshub-theme";
const CHANGE_EVENT = "sportshub-theme-change";
type Theme = "light" | "dark";

function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark";
}

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") {
    return "light";
  }

  const savedTheme = window.localStorage.getItem(STORAGE_KEY) ?? undefined;
  if (isTheme(savedTheme)) {
    return savedTheme;
  }

  const documentTheme = document.documentElement.dataset.theme;
  if (isTheme(documentTheme)) {
    return documentTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => onStoreChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener(CHANGE_EVENT, handleChange);
  mediaQuery.addEventListener("change", handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(CHANGE_EVENT, handleChange);
    mediaQuery.removeEventListener("change", handleChange);
  };
}

function getServerTheme(): Theme {
  return "light";
}

function setThemeCookie(theme: Theme) {
  document.cookie = `${STORAGE_KEY}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getPreferredTheme, getServerTheme);

  function updateTheme(nextTheme: Theme) {
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    setThemeCookie(nextTheme);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${isDark ? "light" : "dark"} view`}
      aria-pressed={isDark}
      onClick={() => updateTheme(isDark ? "light" : "dark")}
      className="flex min-h-11 items-center gap-3 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-semibold text-[var(--text)] transition hover:border-[var(--border-strong)] hover:bg-[var(--hover)]"
    >
      <span className="relative h-5 w-9 rounded-full bg-[var(--badge)]">
        <span
          className={`absolute top-1 h-3 w-3 rounded-full bg-[var(--text)] transition ${
            isDark ? "left-5" : "left-1"
          }`}
        />
      </span>
      <span>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
