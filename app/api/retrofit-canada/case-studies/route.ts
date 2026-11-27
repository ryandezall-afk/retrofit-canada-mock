import { NextRequest, NextResponse } from "next/server";
import { getCachedCaseStudies } from "@/lib/server/retrofit-canada-api";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const province = searchParams.get("province")?.trim().toUpperCase();
  const houseType = searchParams.get("houseType")?.trim().toLowerCase();
  const detailedOnly = searchParams.get("detailedOnly") === "true";
  const limitParam = Number.parseInt(searchParams.get("limit") ?? "25", 10);
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(limitParam, 100))
    : 25;

  const { records, cached, lastSyncedAt, upstreamPings } =
    await getCachedCaseStudies();

  const filtered = records.filter((record) => {
    if (province && record.province !== province) return false;
    if (houseType && !record.houseType.toLowerCase().includes(houseType)) {
      return false;
    }
    if (detailedOnly && !record.hasDetailedMetrics) return false;
    return true;
  });

  return NextResponse.json({
    meta: {
      provider: "mock_retrofit_canada_api",
      cached,
      lastSyncedAt,
      upstreamPings,
      totalMatched: filtered.length,
      returned: Math.min(filtered.length, limit),
    },
    data: filtered.slice(0, limit),
  });
}
