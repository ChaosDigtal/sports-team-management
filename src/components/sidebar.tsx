"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { roleLabel } from "@/lib/access";
import { PLATFORMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { setPlatform } from "@/server/actions";
import type { PlatformId, SessionUser } from "@/lib/types";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: DashboardIcon, superOnly: false },
  { href: "/statistics", label: "Statistics", icon: ChartIcon, superOnly: false },
  { href: "/projects", label: "Projects", icon: LayersIcon, superOnly: false },
  { href: "/tasks", label: "Tasks", icon: CheckIcon, superOnly: false },
  { href: "/accounts", label: "Accounts", icon: CardIcon, superOnly: false },
  { href: "/withdrawals", label: "Withdrawals", icon: WithdrawIcon, superOnly: true },
  { href: "/users", label: "Users", icon: PeopleIcon, superOnly: false },
];

export function Sidebar({ user, platform }: { user: SessionUser; platform: PlatformId }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <aside className="flex w-full flex-col bg-sidebar text-white md:sticky md:top-0 md:h-screen md:w-60">
      <div className="px-4 py-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-md bg-accent text-xs font-semibold">TC</div>
          <div>
            <div className="text-sm font-semibold leading-4">Team Console</div>
            <div className="text-[11px] text-white/50">Sports team management</div>
          </div>
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/40">Platform</span>
          <select
            className="mt-1.5 h-9 w-full rounded-md border border-white/10 bg-[#1c2633] px-2 text-sm text-white"
            value={platform}
            aria-label="Platform"
            disabled={pending}
            onChange={(event) => {
              const value = event.target.value;
              startTransition(async () => {
                await setPlatform(value);
                router.refresh();
              });
            }}
          >
            {PLATFORMS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {item.state === "soon" ? " · soon" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-1 md:flex-col md:overflow-visible md:px-3">
        {items.filter((item) => !item.superOnly || user.isSuperAdmin).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm",
                active ? "bg-white/10 text-white" : "text-[#c5d0dc] hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 md:block">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{user.name}</div>
          <div className="truncate text-xs text-white/50">{roleLabel(user)}</div>
        </div>
        <form action="/api/logout" method="post" className="md:mt-3">
          <button type="submit" className="text-xs text-white/70 hover:text-white">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

function IconFrame({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {children}
    </svg>
  );
}

function DashboardIcon() {
  return (
    <IconFrame>
      <rect x="4" y="4" width="7" height="7" rx="1.2" />
      <rect x="13" y="4" width="7" height="7" rx="1.2" />
      <rect x="4" y="13" width="7" height="7" rx="1.2" />
      <rect x="13" y="13" width="7" height="7" rx="1.2" />
    </IconFrame>
  );
}

function ChartIcon() {
  return (
    <IconFrame>
      <path d="M4 19V5M4 19h16" strokeLinecap="round" />
      <path d="M8 15v-3M12 15V8M16 15v-5" strokeLinecap="round" />
    </IconFrame>
  );
}

function LayersIcon() {
  return (
    <IconFrame>
      <path d="M12 4 4 8l8 4 8-4-8-4Z" strokeLinejoin="round" />
      <path d="m4 12 8 4 8-4M4 16l8 4 8-4" strokeLinejoin="round" />
    </IconFrame>
  );
}

function CheckIcon() {
  return (
    <IconFrame>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </IconFrame>
  );
}

function CardIcon() {
  return (
    <IconFrame>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 10h4M7 14h6" strokeLinecap="round" />
    </IconFrame>
  );
}

function WithdrawIcon() {
  return (
    <IconFrame>
      <path d="M12 3v10" strokeLinecap="round" />
      <path d="m8 9 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 19h14" strokeLinecap="round" />
    </IconFrame>
  );
}

function PeopleIcon() {
  return (
    <IconFrame>
      <circle cx="9" cy="9" r="3" />
      <path d="M4.5 18a4.5 4.5 0 0 1 9 0" strokeLinecap="round" />
      <circle cx="17" cy="10" r="2" />
      <path d="M16 18a3.5 3.5 0 0 1 4-3.4" strokeLinecap="round" />
    </IconFrame>
  );
}
