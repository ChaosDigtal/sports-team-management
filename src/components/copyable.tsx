"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Copyable({ value, className, children }: { value: string; className?: string; children?: ReactNode }) {
  if (!value) return <>—</>;
  return (
    <span className="group/copy inline-flex max-w-full items-center gap-1 align-middle">
      <span className={cn("min-w-0 break-all", className)}>{children ?? value}</span>
      <CopyIconButton value={value} className="opacity-0 group-hover/copy:opacity-100 focus-visible:opacity-100" />
    </span>
  );
}

export function CopyableInput({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  function currentValue() {
    const field = ref.current?.querySelector("input, textarea, select");
    if (!field || !("value" in field)) return "";
    return String(field.value).trim();
  }

  function refresh() {
    setReady(Boolean(currentValue()));
  }

  return (
    <div
      ref={ref}
      className="group/copy relative min-w-0 flex-1 [&_input]:pr-9 [&_select]:pr-14 [&_textarea]:pr-9"
      onMouseEnter={refresh}
      onFocus={refresh}
      onInput={refresh}
    >
      {children}
      <CopyIconButton
        className={cn(
          "absolute top-1/2 right-2 z-10 -translate-y-1/2 group-has-[select]/copy:right-8",
          ready ? "opacity-0 group-hover/copy:opacity-100 group-focus-within/copy:opacity-100" : "hidden",
        )}
        copied={copied}
        onCopy={async () => {
          const value = currentValue();
          if (!value) return;
          await writeClipboard(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }}
      />
    </div>
  );
}

export function CopyIconButton({
  value,
  className,
  copied: copiedProp,
  onCopy,
}: {
  value?: string;
  className?: string;
  copied?: boolean;
  onCopy?: () => void;
}) {
  const [copiedState, setCopiedState] = useState(false);
  const copied = copiedProp ?? copiedState;

  return (
    <button
      type="button"
      aria-label={copied ? "Copied" : "Copy"}
      title={copied ? "Copied" : "Copy"}
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded text-muted hover:bg-[#e7eeec] hover:text-ink",
        className,
      )}
      onMouseDown={(event) => event.preventDefault()}
      onClick={async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (onCopy) {
          onCopy();
          return;
        }
        if (!value) return;
        await writeClipboard(value);
        setCopiedState(true);
        window.setTimeout(() => setCopiedState(false), 1200);
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </button>
  );
}

async function writeClipboard(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const area = document.createElement("textarea");
  area.value = value;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
