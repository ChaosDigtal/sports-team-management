"use client";

import { useState } from "react";
import { inputClass, secondaryBtn } from "./ui";

export function SecretField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      <div className="flex gap-2">
        <input className={inputClass} name={name} defaultValue={defaultValue} type={visible ? "text" : "password"} autoComplete="off" />
        <button type="button" className={secondaryBtn} onClick={() => setVisible((value) => !value)}>
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

export function SecretText({ value }: { value: string }) {
  const [visible, setVisible] = useState(false);
  if (!value) return <>—</>;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="break-all font-mono text-sm">{visible ? value : "••••••••"}</span>
      <button type="button" className="text-xs font-medium text-accent" onClick={() => setVisible((current) => !current)}>
        {visible ? "Hide" : "Show"}
      </button>
    </span>
  );
}
