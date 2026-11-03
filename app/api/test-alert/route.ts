import { requireAdmin } from "@/lib/requireAdmin";
import { sendTestAlerts } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Log in at /login first, then open /api/test-alert. It sends one test email and one test text and shows the result. */
export async function GET() {
  await requireAdmin();
  return Response.json(await sendTestAlerts());
}
