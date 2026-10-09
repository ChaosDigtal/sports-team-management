"use client";

import { dangerBtn } from "./ui";

export function DeleteButton({ action, label }: { action: () => Promise<void>; label: string }) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete this ${label}? This cannot be undone.`)) event.preventDefault();
      }}
    >
      <button type="submit" className={dangerBtn}>
        Delete {label}
      </button>
    </form>
  );
}
