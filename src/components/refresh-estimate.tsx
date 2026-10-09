"use client";

import { useFormStatus } from "react-dom";

export function RefreshEstimateButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <RefreshIcon />
    </form>
  );
}

function RefreshIcon() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label="Refresh estimated profit"
      title="Refresh"
      disabled={pending}
      className="rounded-md p-1 text-muted hover:bg-emerald-100 hover:text-accent disabled:opacity-60"
    >
      <svg viewBox="0 0 20 20" className={`size-4 ${pending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M16.2 10a6.2 6.2 0 1 1-1.6-4.2" strokeLinecap="round" />
        <path d="M16.4 3.6v3.3h-3.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
