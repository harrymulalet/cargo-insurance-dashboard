import { NextResponse } from "next/server"
import { getMonthlyMerchandiseTrade, getMfnTariff, type ProbeInfo } from "@/lib/wto_discovery"
import { getTradeOpennessWB } from "@/lib/worldbank"
import type { ExternalTradeData } from "@/lib/types"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const iso3 = (searchParams.get("iso3") || "").toUpperCase()
  const mode = searchParams.get("mode")
  const debug = searchParams.get("debug") === "1"

  if (!iso3) {
    return NextResponse.json({ error: "iso3 query param required" }, { status: 400 })
  }

  const sanitize = (url?: string) =>
    debug && url ? url.replace(/subscription-key=[^&]+/, "subscription-key=***") : url

  if (mode === "probe") {
    const merchProbe = { exports: { urlsAttempted: [] }, imports: { urlsAttempted: [] } }
    const tariffProbe: ProbeInfo = { urlsAttempted: [] }

    const [merch, tariff] = await Promise.allSettled([
      getMonthlyMerchandiseTrade(iso3, merchProbe),
      getMfnTariff(iso3, tariffProbe),
    ])

    return NextResponse.json(
      {
        iso3,
        probes: {
          monthlyMerchandise: merchProbe,
          mfnTariff: tariffProbe,
        },
        results: {
          monthlyMerchandise: merch.status === "fulfilled" ? merch.value : { error: merch.reason },
          mfnTariff: tariff.status === "fulfilled" ? tariff.value : { error: tariff.reason },
        },
      },
      { status: 200 },
    )
  }

  // Default mode for UI
  const result: ExternalTradeData = { iso3 }
  const [merch, tariff, openness] = await Promise.allSettled([
    getMonthlyMerchandiseTrade(iso3),
    getMfnTariff(iso3),
    getTradeOpennessWB(iso3),
  ])

  if (merch.status === "fulfilled") {
    result.monthlyMerchandise = {
      exports: merch.value.exports ? { ...merch.value.exports, url: sanitize(merch.value.exports.url) } : null,
      imports: merch.value.imports ? { ...merch.value.imports, url: sanitize(merch.value.imports.url) } : null,
    }
  }
  if (tariff.status === "fulfilled" && tariff.value) {
    result.mfnTariff = { ...tariff.value, url: sanitize(tariff.value.url) }
  }
  if (openness.status === "fulfilled" && openness.value) {
    result.tradeOpenness = {
      ...openness.value,
      url: sanitize(openness.value.url) ?? "https://data.worldbank.org/",
    }
  }

  return NextResponse.json(result, { status: 200 })
}
