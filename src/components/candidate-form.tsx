"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { ACCOUNT_TIMEZONES, CANDIDATE_STATUSES, CHROME_REMOTE_OPTIONS, COUNTRIES, GENDERS, RACES } from "@/lib/constants";
import type { ActionState, Candidate } from "@/lib/types";
import { DeleteButton } from "./delete-button";
import { SecretField } from "./secret-fields";
import { FormError, hintClass, inputClass, labelClass, primaryBtn, secondaryBtn } from "./ui";

export function CandidateForm({
  action,
  candidate,
  showShare = false,
  onDelete,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  candidate?: Candidate;
  showShare?: boolean;
  onDelete?: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <div className="max-w-3xl">
      <form id="candidate-form" action={formAction} className="rounded-lg border border-line bg-surface p-5">
        <FormError message={state.error} />
        {candidate ? <input type="hidden" name="id" value={candidate.id} /> : null}
        {candidate ? (
          <p className="mb-5 text-sm text-muted">
            Candidate ID <span className="font-mono text-ink">{candidate.id}</span>
          </p>
        ) : null}
        <Section title="Candidate">
          <Field label="Name">
            <input className={inputClass} name="name" defaultValue={candidate?.name} required />
          </Field>
          {showShare ? (
            <Field label="Profit share %" hint="Portion of earnings kept as profit.">
              <input className={inputClass} name="sharingPercent" type="number" min="0" max="100" step="0.1" defaultValue={candidate?.sharingPercent ?? ""} />
            </Field>
          ) : null}
          <Field label="Timezone">
            <select className={inputClass} name="timezone" defaultValue={candidate?.timezone ?? "UTC-8"}>
              {ACCOUNT_TIMEZONES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Email">
            <input className={inputClass} name="email" type="email" autoComplete="off" defaultValue={candidate?.email} />
          </Field>
          <SecretField label="Email password" name="emailPassword" defaultValue={candidate?.emailPassword} />
          <SecretField label="Account password" name="accountPassword" defaultValue={candidate?.accountPassword} />
          <Field label="WhatsApp">
            <input className={inputClass} name="whatsapp" defaultValue={candidate?.whatsapp} placeholder="+1 415 555 0100" />
          </Field>
          <Field label="Telegram">
            <input className={inputClass} name="telegram" defaultValue={candidate?.telegram} placeholder="@username" autoComplete="off" />
          </Field>
          <Field label="Phone">
            <input className={inputClass} name="phone" defaultValue={candidate?.phone} />
          </Field>
          <Field label="Status">
            <select className={inputClass} name="status" defaultValue={candidate?.status ?? "Pending"}>
              {CANDIDATE_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
        </Section>
        <Section title="Remote access">
          <Field label="Chrome Remote Desktop">
            <select className={inputClass} name="chromeRemote" defaultValue={candidate?.chromeRemote ?? ""}>
              {CHROME_REMOTE_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="AnyDesk ID">
            <input className={inputClass} name="anydeskId" defaultValue={candidate?.anydeskId} autoComplete="off" />
          </Field>
          <SecretField label="AnyDesk password" name="anydeskPassword" defaultValue={candidate?.anydeskPassword} />
          <Field label="UltraViewer ID">
            <input className={inputClass} name="ultraviewerId" defaultValue={candidate?.ultraviewerId} autoComplete="off" />
          </Field>
          <SecretField label="UltraViewer password" name="ultraviewerPassword" defaultValue={candidate?.ultraviewerPassword} />
        </Section>
        <Section title="Client profile">
          <Field label="Date of birth">
            <input className={inputClass} name="dob" type="date" defaultValue={candidate?.dob} />
          </Field>
          <Field label="Gender">
            <select className={inputClass} name="gender" defaultValue={candidate?.gender ?? ""}>
              <option value="">Select</option>
              {GENDERS.map((gender) => (
                <option key={gender}>{gender}</option>
              ))}
            </select>
          </Field>
          <Field label="Race">
            <select className={inputClass} name="race" defaultValue={candidate?.race ?? ""}>
              <option value="">Select</option>
              {RACES.map((race) => (
                <option key={race}>{race}</option>
              ))}
            </select>
          </Field>
          <Field label="Country">
            <select className={inputClass} name="country" defaultValue={candidate?.country ?? ""}>
              <option value="">Select</option>
              {COUNTRIES.map((country) => (
                <option key={country.id} value={country.id}>
                  {country.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input className={inputClass} name="address" defaultValue={candidate?.address} />
          </Field>
          <Field label="LinkedIn URL">
            <input className={inputClass} name="linkedinUrl" type="url" defaultValue={candidate?.linkedinUrl} placeholder="https://" />
          </Field>
          <Field label="Resume URL">
            <input className={inputClass} name="resumeUrl" type="url" defaultValue={candidate?.resumeUrl} placeholder="https://" />
          </Field>
        </Section>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {candidate && onDelete ? <DeleteButton action={onDelete} label="candidate" /> : <span />}
        <div className="ml-auto flex gap-2">
          <Link href="/onboarding" className={secondaryBtn}>
            Cancel
          </Link>
          <button className={primaryBtn} type="submit" form="candidate-form" disabled={pending}>
            {pending ? "Saving…" : candidate ? "Save candidate" : "Create candidate"}
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
