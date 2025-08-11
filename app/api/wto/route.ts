import { NextResponse } from "next/server"
import { fetchWtoCountryTrade } from "@/lib/wto"
import { getTradeOpennessWB } from "@/lib/worldbank"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const iso3 = (searchParams.get("iso3") || "").toUpperCase()
  const result: any = { iso3, sources: {} }

  if (!iso3) {
    return NextResponse.json({ error: "iso3 query param required" }, { status: 400 })
  }

  try {
    const [trade, openness] = await Promise.allSettled([fetchWtoCountryTrade(iso3), getTradeOpennessWB(iso3)])

    if (trade.status === "fulfilled" && trade.value) {
      result.importsUsdBn = trade.value.importsUsdBn
      result.importsYear = trade.value.importsYear
      result.exportsUsdBn = trade.value.exportsUsdBn
      result.exportsYear = trade.value.exportsYear
      // The user requested wtoImports and wtoExports, but the new lib returns importsUrl and exportsUrl
      // I will map them correctly.
      result.sources.imports = trade.value.importsUrl
      result.sources.exports = trade.value.exportsUrl
    } else if (trade.status === "rejected") {
      console.warn(`[/api/wto] WTO fetch failed for ${iso3}:`, trade.reason?.message || trade.reason)
    }

    if (openness.status === "fulfilled" && openness.value) {
      result.tradeOpennessPct = openness.value.value
      result.tradeOpennessYear = openness.value.year
      result.sources.openness = openness.value.url
    } else if (openness.status === "rejected") {
      console.warn(`[/api/wto] World Bank fetch failed for ${iso3}:`, openness.reason?.message || openness.reason)
    }
  } catch (e: any) {
    // final safety net; never let this throw 500
    console.warn("[/api/wto] degraded mode:", e?.message || e)
  }
  return NextResponse.json(result, { status: 200 })
}
