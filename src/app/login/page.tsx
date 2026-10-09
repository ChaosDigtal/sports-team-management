import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { one } from "@/lib/utils";
import type { SearchParams } from "@/lib/types";
import { inputClass, labelClass, primaryBtn } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;
  const failed = one(params.error) === "1";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col bg-sidebar px-8 py-10 text-white lg:px-14 lg:py-16">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-md bg-accent text-sm font-semibold">TC</div>
          <div>
            <div className="text-sm font-semibold">Team Console</div>
            <div className="text-xs text-white/55">Sports team management</div>
          </div>
        </div>
        <div className="mt-14 max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight">Run the platforms from one desk.</h1>
          <p className="mt-4 text-sm leading-6 text-white/70">
            DA is open. Handshake and Snorkel will follow, each with its own account and task fields.
          </p>
          <ul className="mt-8 divide-y divide-white/10 border-y border-white/10 text-sm">
            <PlatformRow name="DA" state="Live" />
            <PlatformRow name="Handshake" state="Later" />
            <PlatformRow name="Snorkel" state="Later" />
          </ul>
        </div>
        <p className="mt-auto hidden pt-16 text-sm text-white/45 lg:block">Reporting weeks use Japan Standard Time.</p>
      </section>
      <section className="flex items-center justify-center bg-canvas px-6 py-16">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Use the login ID a super admin gave you. There is no public sign-up.</p>
          {failed ? (
            <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
              That ID and password do not match.
            </p>
          ) : null}
          <form method="post" action="/api/login" className="mt-6 grid gap-4">
            <label>
              <span className={labelClass}>Login ID</span>
              <input className={inputClass} name="id" autoComplete="username" required />
            </label>
            <label>
              <span className={labelClass}>Password</span>
              <input className={inputClass} name="password" type="password" autoComplete="current-password" required />
            </label>
            <button className={`${primaryBtn} mt-2 w-full`} type="submit">
              Sign in
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function PlatformRow({ name, state }: { name: string; state: string }) {
  return (
    <li className="flex items-center justify-between py-3">
      <span>{name}</span>
      <span className="text-white/50">{state}</span>
    </li>
  );
}
