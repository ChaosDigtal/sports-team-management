"use client";

import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { ACCOUNT_STATUSES, ACCOUNT_TIMEZONES, CHROME_REMOTE_OPTIONS, COUNTRIES, GENDERS, RACES } from "@/lib/constants";
import { clockValue } from "@/lib/format";
import { defaultWithdrawalMinutes, WEEKDAY_LABELS } from "@/lib/time";
import type { Account, ActionState } from "@/lib/types";
import { DeleteButton } from "./delete-button";
import { SecretField } from "./secret-fields";
import { FormError, hintClass, inputClass, labelClass, primaryBtn, secondaryBtn } from "./ui";

export function AccountForm({
  action,
  account,
  suspendedLocal,
  onDelete,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  account?: Account;
  suspendedLocal?: string;
  onDelete?: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [zone, setZone] = useState(account?.timezone ?? "UTC-8");
  const [weekday, setWeekday] = useState(String(account?.withdrawalWeekday ?? 4));
  const [clock, setClock] = useState(clockValue(account?.withdrawalMinutes ?? defaultWithdrawalMinutes(account?.timezone ?? "UTC-8")));
  const [scheduleTouched, setScheduleTouched] = useState(Boolean(account));
  return (
    <div className="max-w-3xl">
      <form id="account-form" action={formAction} className="rounded-lg border border-line bg-white p-5">
        <FormError message={state.error} />
        {account ? <input type="hidden" name="id" value={account.id} /> : null}
        {account ? (
          <p className="mb-5 text-sm text-muted">
            Account ID <span className="font-mono text-ink">{account.id}</span>
          </p>
        ) : null}
        <Section title="Account">
          <Field label="Name">
            <input className={inputClass} name="name" defaultValue={account?.name} required />
          </Field>
          <Field label="Profit share %" hint="Portion of earnings kept as profit.">
            <input className={inputClass} name="sharingPercent" type="number" min="0" max="100" step="0.1" defaultValue={account?.sharingPercent ?? ""} />
          </Field>
          <Field label="Weekly Target Work Hours" hint="Compared with hours logged this week, Sunday through Saturday in Japan Standard Time.">
            <input className={inputClass} name="weeklyTargetHours" type="number" min="0" step="0.5" defaultValue={account?.weeklyTargetHours ?? 40} />
          </Field>
          <Field label="Timezone">
            <select
              className={inputClass}
              name="timezone"
              value={zone}
              onChange={(event) => {
                const next = event.target.value;
                setZone(next);
                if (!scheduleTouched) {
                  setWeekday("4");
                  setClock(clockValue(defaultWithdrawalMinutes(next)));
                }
              }}
            >
              {ACCOUNT_TIMEZONES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            className="sm:col-span-2"
            label="Scheduled withdrawal"
            hint="Repeats every week in Japan Standard Time. UTC-8 through UTC-3 defaults to Thursday 11:00 PM. Other time zones default to Thursday 3:00 PM."
          >
            <div className="grid grid-cols-2 gap-2">
              <select
                className={inputClass}
                name="withdrawalWeekday"
                value={weekday}
                onChange={(event) => {
                  setScheduleTouched(true);
                  setWeekday(event.target.value);
                }}
              >
                {WEEKDAY_LABELS.map((day, index) => (
                  <option key={day} value={index}>
                    {day}
                  </option>
                ))}
              </select>
              <input
                className={inputClass}
                name="withdrawalTime"
                type="time"
                value={clock}
                onChange={(event) => {
                  setScheduleTouched(true);
                  setClock(event.target.value);
                }}
              />
            </div>
          </Field>
          <Field label="Email">
            <input className={inputClass} name="email" type="email" autoComplete="off" defaultValue={account?.email} />
          </Field>
          <SecretField label="Email password" name="emailPassword" defaultValue={account?.emailPassword} />
          <SecretField label="Account password" name="accountPassword" defaultValue={account?.accountPassword} />
          <Field label="WhatsApp">
            <input className={inputClass} name="whatsapp" defaultValue={account?.whatsapp} placeholder="+1 415 555 0100" />
          </Field>
          <Field label="Phone">
            <input className={inputClass} name="phone" defaultValue={account?.phone} />
          </Field>
          <Field label="Status">
            <select className={inputClass} name="status" defaultValue={account?.status ?? "Active"}>
              {ACCOUNT_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Suspended at" hint="Filled in for a suspended status. Cleared when the account is Active.">
            <input className={inputClass} name="suspendedAt" type="datetime-local" defaultValue={suspendedLocal ?? ""} />
          </Field>
          <div className="rounded-md border border-line bg-[#f7f8fa] p-4 sm:col-span-2">
            <h3 className="text-sm font-semibold">AI Datatrainer Account</h3>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <input className={inputClass} name="trainerEmail" type="email" autoComplete="off" defaultValue={account?.trainerEmail} />
              </Field>
              <SecretField label="Password" name="trainerPassword" defaultValue={account?.trainerPassword} />
              <Field label="Bitwarden email">
                <input className={inputClass} name="bitwardenEmail" type="email" autoComplete="off" defaultValue={account?.bitwardenEmail} />
              </Field>
              <SecretField label="Bitwarden master password" name="bitwardenPassword" defaultValue={account?.bitwardenPassword} />
            </div>
          </div>
        </Section>
        <Section title="Remote access">
          <Field label="Chrome Remote Desktop">
            <select className={inputClass} name="chromeRemote" defaultValue={account?.chromeRemote ?? ""}>
              {CHROME_REMOTE_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="AnyDesk ID">
            <input className={inputClass} name="anydeskId" defaultValue={account?.anydeskId} autoComplete="off" />
          </Field>
          <SecretField label="AnyDesk password" name="anydeskPassword" defaultValue={account?.anydeskPassword} />
          <Field label="UltraViewer ID">
            <input className={inputClass} name="ultraviewerId" defaultValue={account?.ultraviewerId} autoComplete="off" />
          </Field>
          <SecretField label="UltraViewer password" name="ultraviewerPassword" defaultValue={account?.ultraviewerPassword} />
        </Section>
        <Section title="Client profile">
          <Field label="Date of birth">
            <input className={inputClass} name="dob" type="date" defaultValue={account?.dob} />
          </Field>
          <Field label="Gender">
            <select className={inputClass} name="gender" defaultValue={account?.gender ?? ""}>
              <option value="">Select</option>
              {GENDERS.map((gender) => (
                <option key={gender}>{gender}</option>
              ))}
            </select>
          </Field>
          <Field label="Race">
            <select className={inputClass} name="race" defaultValue={account?.race ?? ""}>
              <option value="">Select</option>
              {RACES.map((race) => (
                <option key={race}>{race}</option>
              ))}
            </select>
          </Field>
          <Field label="Country">
            <select className={inputClass} name="country" defaultValue={account?.country ?? ""}>
              <option value="">Select</option>
              {COUNTRIES.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input className={inputClass} name="address" defaultValue={account?.address} />
          </Field>
          <Field label="LinkedIn URL">
            <input className={inputClass} name="linkedinUrl" type="url" defaultValue={account?.linkedinUrl} placeholder="https://" />
          </Field>
          <Field label="Resume URL">
            <input className={inputClass} name="resumeUrl" type="url" defaultValue={account?.resumeUrl} placeholder="https://" />
          </Field>
        </Section>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {account && onDelete ? <DeleteButton action={onDelete} label="account" /> : <span />}
        <div className="ml-auto flex gap-2">
          <Link href="/accounts" className={secondaryBtn}>
            Cancel
          </Link>
          <button className={primaryBtn} type="submit" form="account-form" disabled={pending}>
            {pending ? "Saving…" : account ? "Save account" : "Create account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mt-6 border-t border-line pt-5 first:mt-0 first:border-0 first:pt-0">
      <legend className="mb-3 text-sm font-semibold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={className}>
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <span className={hintClass}>{hint}</span> : null}
    </label>
  );
}
