"use client";

import { useTransition } from "react";
import { LAPTOP_STATUSES } from "@/lib/constants";
import type { LaptopStatus } from "@/lib/types";
import { saveLaptopStatus } from "@/server/actions";

export function LaptopStatusSelect({
  candidateId,
  value,
  disabled,
  onChange,
}: {
  candidateId: string;
  value: LaptopStatus;
  disabled?: boolean;
  onChange: (value: LaptopStatus) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      className="h-8 max-w-32 rounded-md border border-line bg-surface px-2 text-sm disabled:opacity-60"
      value={value}
      disabled={disabled || pending}
      aria-label="Laptop status"
      onChange={(event) => {
        const next = event.target.value as LaptopStatus;
        onChange(next);
        startTransition(() => {
          void saveLaptopStatus(candidateId, next);
        });
      }}
    >
      {LAPTOP_STATUSES.map((status) => (
        <option key={status}>{status}</option>
      ))}
    </select>
  );
}
