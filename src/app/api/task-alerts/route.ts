import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listTaskAlerts } from "@/lib/task-alerts";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ alerts: [] }, { status: 401 });
  return NextResponse.json({ alerts: listTaskAlerts(user) });
}
