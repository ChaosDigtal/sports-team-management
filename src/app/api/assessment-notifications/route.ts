import { pullNotifications } from "@/lib/assessment-notifications";
import { canAccessOnboarding } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canAccessOnboarding(user)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const notifications = await pullNotifications();
  return Response.json({ notifications });
}
