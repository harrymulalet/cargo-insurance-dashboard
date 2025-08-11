const WB_BASE_URL = "https://api.worldbank.org/v2/country"
const INDICATOR_TRADE_OPENNESS = "NE.TRD.GNFS.ZS" // Trade as % of GDP

interface WbDataPoint {
  indicator: { id: string; value: string }
  country: { id: string; value: string }
  countryiso3code: string
  date: string
  value: number | null
  unit: string
  obs_status: string
  decimal: number
}

export async function getTradeOpennessWB(iso3: string): Promise<{ year: number; value: number; url: string } | null> {
  const url = `${WB_BASE_URL}/${iso3}/indicator/${INDICATOR_TRADE_OPENNESS}?format=json&date=2018:2025`
  try {
    const res = await fetch(url, { cache: "force-cache" })
    if (!res.ok) {
      console.warn(`World Bank API request failed for ${iso3} with status ${res.status}`)
      return null
    }

    const json = await res.json()
    if (!Array.isArray(json) || json.length < 2 || !Array.isArray(json[1])) {
      return null
    }

    const latestData = json[1]
      .filter((d: WbDataPoint) => d.value !== null)
      .sort((a: WbDataPoint, b: WbDataPoint) => Number.parseInt(b.date, 10) - Number.parseInt(a.date, 10))[0]

    if (latestData && latestData.value) {
      return {
        year: Number.parseInt(latestData.date, 10),
        value: Number.parseFloat(latestData.value.toFixed(1)),
        url,
      }
    }
    return null
  } catch (error) {
    console.error(`Error fetching World Bank data for ${iso3}:`, error)
    return null
  }
}
