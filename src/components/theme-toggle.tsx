"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

function subscribe(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function darkNow() {
  return document.documentElement.classList.contains("dark");
}

export function ThemeToggle({ tone = "sidebar" }: { tone?: "sidebar" | "surface" }) {
  const dark = useSyncExternalStore(subscribe, darkNow, () => false);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      className={cn(
        "text-xs",
        tone === "sidebar" ? "block text-left text-white/70 hover:text-white" : "font-medium text-muted hover:text-ink",
      )}
    >
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
