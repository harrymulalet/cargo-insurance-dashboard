// Helper delay function
async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function getTradeOpennessWB(iso3: string): Promise<{ year: number; value: number; url: string } | null> {
  const url = `https://api.worldbank.org/v2/country/${iso3}/indicator/TG.VAL.TOTL.GD.ZS?format=json&MRV=10`

  const tryFetch = async (attempt: number): Promise<{ year: number; value: number; url: string } | null> => {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } })

      // Handle rate limits and transient errors
      if ([429, 503].includes(res.status)) {
        if (attempt < 4) {
          // Exponential backoff: 500ms, 1000ms, 2000ms
          await delay(500 * Math.pow(2, attempt - 1))
          return tryFetch(attempt + 1)
        }
        return null
      }

      // Read as text, then parse JSON safely
      const text = await res.text()
      if (!res.ok) {
        console.warn("World Bank API non-OK:", res.status, text?.slice(0, 200))
        return null
      }

      let json: any
      try {
        json = JSON.parse(text)
      } catch {
        if (attempt < 4 && /too many/i.test(text)) {
          await delay(500 * Math.pow(2, attempt - 1))
          return tryFetch(attempt + 1)
        }
        console.warn("World Bank response not JSON:", text?.slice(0, 200))
        return null
      }

      const series = Array.isArray(json) ? json[1] : null
      if (series && Array.isArray(series)) {
        // Find most recent non-null value
        const latest = series.find((d: any) => d?.value !== null)
        if (latest) {
          return {
            year: Number(latest.date),
            value: Number(latest.value),
            url,
          }
        }
      }
      return null
    } catch (err) {
      if (attempt < 4) {
        await delay(500 * Math.pow(2, attempt - 1))
        return tryFetch(attempt + 1)
      }
      console.error("World Bank fetch failed:", err)
      return null
    }
  }

  return tryFetch(1)
}
