"use client";

import { WITHDRAWAL_STATUSES } from "@/lib/constants";
import { setWithdrawalStatus } from "@/server/actions";

export function WithdrawalStatusSelect({ id, status, returnTo }: { id: string; status: string; returnTo: string }) {
  return (
    <form action={setWithdrawalStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <select
        name="status"
        defaultValue={status}
        aria-label={`Status for ${id}`}
        className="h-8 rounded-md border border-line bg-white px-2 text-sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {WITHDRAWAL_STATUSES.map((item) => (
          <option key={item}>{item}</option>
        ))}
      </select>
    </form>
  );
}
