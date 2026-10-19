import type { ReactNode } from "react";
import { AccessNote } from "@/components/ui";
import { canAccessOnboarding } from "@/lib/access";
import { requireUser } from "@/lib/auth";

export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  if (!canAccessOnboarding(user)) {
    return <AccessNote title="Onboarding is limited" body="A super admin can assign the DA Onboarding role on your user page." />;
  }
  return children;
}
