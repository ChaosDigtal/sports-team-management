import { getCurrentUser } from "@/lib/auth";
import { takeNotifications } from "@/lib/assessment-notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ notifications: takeNotifications() });
}
