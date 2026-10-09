import type { ReactNode } from "react";
import { ComingSoon } from "@/components/coming-soon";
import { Sidebar } from "@/components/sidebar";
import { TaskAlerts } from "@/components/task-alerts";
import { AccessNote, secondaryBtn } from "@/components/ui";
import { hasDaAccess } from "@/lib/access";
import { getPlatform, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!hasDaAccess(user)) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
        <AccessNote title="No DA access yet" body="A super admin can assign a DA role to this login." />
        <form action="/api/logout" method="post" className="mt-4">
          <button className={secondaryBtn} type="submit">
            Sign out
          </button>
        </form>
      </div>
    );
  }
  const platform = await getPlatform();
  return (
    <div className="min-h-screen md:flex">
      <Sidebar user={user} platform={platform} />
      <div className="min-w-0 flex-1">
        <TaskAlerts />
        <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          {platform === "da" ? children : <ComingSoon platform={platform} />}
        </div>
      </div>
    </div>
  );
}
