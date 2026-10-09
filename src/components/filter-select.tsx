"use client";

import type { SelectHTMLAttributes } from "react";

export function FilterSelect({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={className}
      onChange={(event) => {
        props.onChange?.(event);
        event.currentTarget.form?.requestSubmit();
      }}
    />
  );
}
