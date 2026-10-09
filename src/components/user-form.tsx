"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { ActionState, SessionUser } from "@/lib/types";
import { DeleteButton } from "./delete-button";
import { FormError, hintClass, inputClass, labelClass, primaryBtn, secondaryBtn } from "./ui";

export function UserForm({
  action,
  user,
  lockSuperAdmin,
  onDelete,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  user?: SessionUser;
  lockSuperAdmin?: boolean;
  onDelete?: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const daRole = user?.roles.da ?? "";
  return (
    <div className="max-w-2xl">
      <form id="user-form" action={formAction} className="rounded-lg border border-line bg-white p-5">
        <FormError message={state.error} />
        {user ? <input type="hidden" name="id" value={user.id} /> : null}
        <div className="grid gap-4">
          <label>
            <span className={labelClass}>Name</span>
            <input className={inputClass} name="name" defaultValue={user?.name} required />
          </label>
          {user ? (
            <div>
              <div className={labelClass}>Login ID</div>
              <div className="font-mono text-sm">{user.id}</div>
            </div>
          ) : (
            <label>
              <span className={labelClass}>Login ID</span>
              <input className={inputClass} name="loginId" autoComplete="off" required placeholder="maya.chen" />
              <span className={hintClass}>Used to sign in. Start with a letter. Letters, numbers, dots, and hyphens only.</span>
            </label>
          )}
          <label>
            <span className={labelClass}>{user ? "New password" : "Password"}</span>
            <input className={inputClass} name="password" type="password" autoComplete="new-password" minLength={user ? undefined : 8} />
            <span className={hintClass}>
              {user ? "Leave blank to keep the current password. Passwords are stored hashed." : "At least 8 characters. It is stored hashed."}
            </span>
          </label>
          <fieldset>
            <legend className={labelClass}>Roles</legend>
            <label className="mt-2 flex items-center gap-2 text-sm">
              {lockSuperAdmin ? <input type="hidden" name="isSuperAdmin" value="on" /> : null}
              <input
                type="checkbox"
                name="isSuperAdmin"
                value="on"
                defaultChecked={user?.isSuperAdmin || lockSuperAdmin}
                disabled={lockSuperAdmin}
                className="size-4 accent-accent"
              />
              Super admin
            </label>
            {lockSuperAdmin ? <span className={hintClass}>The console keeps this super admin.</span> : null}
            <div className="mt-4 text-sm font-medium">DA</div>
            <div className="mt-2 grid gap-2">
              <RoleOption value="" current={daRole} label="No DA access" />
              <RoleOption value="member" current={daRole} label="Member" />
              <RoleOption value="platform_admin" current={daRole} label="Platform admin" />
            </div>
            <p className={`${hintClass} mt-3`}>Handshake and Snorkel roles will be assigned when those workspaces open.</p>
          </fieldset>
        </div>
      </form>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {user && onDelete ? <DeleteButton action={onDelete} label="user" /> : <span />}
        <div className="ml-auto flex gap-2">
          <Link href="/users" className={secondaryBtn}>
            Cancel
          </Link>
          <button className={primaryBtn} type="submit" form="user-form" disabled={pending}>
            {pending ? "Saving…" : user ? "Save user" : "Create user"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RoleOption({ value, current, label }: { value: string; current: string; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="radio" name="daRole" value={value} defaultChecked={current === value} className="size-4 accent-accent" />
      {label}
    </label>
  );
}
