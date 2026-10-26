import { NextRequest } from "next/server";
import { GET as getMetrics } from "@/app/api/dashboard/metrics/route";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/dashboard
 * Ruta de compatibilidad retroactiva hacia /api/dashboard/metrics
 */
export async function GET(req: NextRequest) {
  return getMetrics(req);
}
