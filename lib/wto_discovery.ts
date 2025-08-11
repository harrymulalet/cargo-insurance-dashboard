const WTO_BASE = "https://api.wto.org/timeseries/v1"
const COMMON_PARAMS = { fmt: "json", mode: "full", lang: "1", meta: "false" } as const

// ---------- Types ----------
export interface Indicator {
  code: string
  label: string
  dimensions: string[]
}
export interface LatestValue {
  period: string | number
  value: number
  unit?: string
  url: string
}
export interface DimensionInfo {
  partnerKey?: string
  worldCode?: string
  productKey?: string
  totalCode?: string
}
export interface ProbeInfo {
  indicatorCode?: string
  urlsAttempted: string[]
  dimensionsUsed?: DimensionInfo | null
  rawValue?: Omit<LatestValue, "url"> | null
}

// ---------- Caching & Concurrency ----------
const resultCache = new Map<string, { expires: number; data: any }>()
const inflight = new Map<string, Promise<any>>()
let inFlightCount = 0
const MAX_PARALLEL = 2

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))
const jitter = (ms: number) => ms + Math.floor(Math.random() * 100)

async function gate<T>(fn: () => Promise<T>): Promise<T> {
  while (inFlightCount >= MAX_PARALLEL) {
    await sleep(50)
  }
  inFlightCount++
  try {
    return await fn()
  } finally {
    inFlightCount--
  }
}

function withCache<T>(key: string, fn: () => Promise<T>, ttlMs: number): Promise<T> {
  const cached = resultCache.get(key)
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.data as T)
  if (inflight.has(key)) return inflight.get(key)!

  const promise = fn().then((data) => {
    resultCache.set(key, { expires: Date.now() + ttlMs, data })
    return data
  })
  inflight.set(key, promise)
  promise.finally(() => inflight.delete(key))
  return promise
}

// ---------- Core Fetcher ----------
function sanitizeUrl(u: string): string {
  try {
    const url = new URL(u)
    url.searchParams.delete("subscription-key")
    return url.toString()
  } catch {
    return u
  }
}

class WtoApiError extends Error {
  constructor(
    message: string,
    public url: string,
  ) {
    super(message)
    this.name = "WtoApiError"
  }
}

async function wtoFetchJson(
  path: string,
  params: Record<string, string | number>,
): Promise<{ json: any; url: string }> {
  const keys = [process.env.WTO_API_KEY_PRIMARY, process.env.WTO_API_KEY_SECONDARY].filter(Boolean) as string[]
  if (keys.length === 0) throw new Error("WTO API keys are not configured.")

  let lastErr: any
  let lastUrl = ""

  return gate(async () => {
    for (const key of keys) {
      for (let i = 0; i < 4; i++) {
        const u = new URL(WTO_BASE + path)
        Object.entries({ ...COMMON_PARAMS, ...params }).forEach(([k, v]) => u.searchParams.set(k, String(v)))
        u.searchParams.set("subscription-key", key)
        lastUrl = u.toString()

        try {
          const res = await fetch(u.toString(), { headers: { Accept: "application/json" }, cache: "no-store" })
          if (res.status === 429 || res.status === 503) {
            await sleep(jitter([500, 1000, 2000, 4000][i] || 4000))
            continue
          }
          if (!res.ok) {
            if (res.status === 401 || res.status === 403) break // Key failed, rotate
            continue // Other transient error, retry
          }
          if (!res.headers.get("content-type")?.includes("json")) {
            throw new WtoApiError(`WTO API returned non-JSON content`, sanitizeUrl(lastUrl))
          }
          return { json: await res.json(), url: lastUrl }
        } catch (e) {
          lastErr = e
          if (i < 3) await sleep(jitter([500, 1000, 2000, 4000][i] || 4000))
        }
      }
    }
    throw lastErr || new WtoApiError(`WTO fetch failed after all retries`, sanitizeUrl(lastUrl))
  })
}

// ---------- Discovery Functions ----------
async function searchIndicatorsByLabel(substr: string): Promise<Indicator[]> {
  return withCache(
    `indicators-all`,
    async () => {
      const { json } = await wtoFetchJson("/indicators", {})
      return json?.Dataset ?? []
    },
    24 * 60 * 60 * 1000,
  ).then((allIndicators: any[]) =>
    allIndicators
      .filter((ind: any) => ind.label?.toLowerCase().includes(substr.toLowerCase()))
      .map((ind: any) => ({
        code: ind.code,
        label: ind.label,
        dimensions: ind.dimensions?.map((d: any) => d.id) ?? [],
      })),
  )
}

async function getIndicatorMetadata(indicatorCode: string) {
  return withCache(
    `indicator-meta-${indicatorCode}`,
    () => wtoFetchJson(`/indicators/${indicatorCode}`, {}).then((res) => res.json),
    24 * 60 * 60 * 1000,
  )
}

async function inferDims(indicatorCode: string): Promise<DimensionInfo | null> {
  const metadata = await getIndicatorMetadata(indicatorCode)
  if (!metadata) return null

  const info: DimensionInfo = {}
  for (const dim of metadata.dimensions ?? []) {
    const values = dim.values ?? []
    if (values.some((v: any) => v.code === "000" || v.label === "World")) {
      info.partnerKey = dim.id
      info.worldCode = "000"
    }
    if (values.some((v: any) => v.code === "TO" || v.label === "Total")) {
      info.productKey = dim.id
      info.totalCode = "TO"
    } else if (values.some((v: any) => v.code === "all" || v.label === "All")) {
      info.productKey = dim.id
      info.totalCode = "all"
    }
  }
  return info
}

async function getEconomyMap(): Promise<Record<string, string>> {
  return withCache(
    "economy-map",
    async () => {
      const { json } = await wtoFetchJson("/economies", {})
      const map: Record<string, string> = {}
      for (const r of json?.Dataset ?? []) {
        const a3 = String(r.Alpha3Code || "").toUpperCase()
        const code = String(r.Code || "")
        if (a3 && code) map[a3] = code
      }
      return map
    },
    24 * 60 * 60 * 1000,
  )
}

// ---------- Data Processing ----------
function pickLatest(json: any): Omit<LatestValue, "url"> | null {
  const seriesArr = json?.Dataset
  if (!Array.isArray(seriesArr)) return null
  let best: Omit<LatestValue, "url"> | null = null
  for (const s of seriesArr) {
    const unit = s?.Unit
    const rows = s?.Data ?? s?.Value ?? json?.Value ?? []
    for (const r of rows) {
      const periodRaw = r.TIME_PERIOD ?? r.Time ?? r.Year ?? r.Period ?? r.TIME
      const valueRaw = r.Value ?? r.OBS_VALUE ?? r.VALUE ?? r.value
      const period = String(periodRaw ?? "")
      const value = Number(valueRaw)
      if (period && Number.isFinite(value)) {
        const current = { period, value, unit }
        if (!best || period > best.period) best = current
      }
    }
  }
  return best
}

export function toUsdBn(value: number, unit?: string): number {
  const u = (unit || "").toLowerCase()
  if (u.includes("million")) return +(value / 1_000).toFixed(1)
  if (u.includes("thousand")) return +(value / 1_000_000).toFixed(1)
  if (u.includes("billion")) return +value.toFixed(1)
  return +(value / 1_000_000_000).toFixed(1)
}

// ---------- Main Fetch Logic ----------
async function fetchLatestValue(
  indicatorCode: string,
  iso3: string,
  options: { needPartner?: boolean; needProduct?: boolean },
  probe?: ProbeInfo,
): Promise<LatestValue | null> {
  const key = `latest-${indicatorCode}-${iso3}-${options.needPartner}-${options.needProduct}`
  const cached = resultCache.get(key)
  if (cached && cached.expires > Date.now()) return cached.data

  const promise = (async (): Promise<LatestValue | null> => {
    const dims = await inferDims(indicatorCode)
    if (probe) {
      probe.indicatorCode = indicatorCode
      probe.dimensionsUsed = dims
    }

    const year = new Date().getFullYear()
    const ps = `${year - 6}-${year}`

    const attemptFetch = async (reporter: string): Promise<LatestValue | null> => {
      const baseParams: Record<string, string> = { i: indicatorCode, r: reporter, ps }
      if (options.needPartner && dims?.partnerKey && dims.worldCode) {
        baseParams[dims.partnerKey] = dims.worldCode
      }
      if (options.needProduct && dims?.productKey && dims.totalCode) {
        baseParams[dims.productKey] = dims.totalCode
      }

      const paramVariants = [
        baseParams,
        { ...baseParams, p: "000" },
        { ...baseParams, p: "000", px: "TO" },
        { ...baseParams, p: "000", pc: "TO" },
        { ...baseParams, p: "000", pc: "all" },
      ]
      const uniqueParamVariants = [...new Map(paramVariants.map((item) => [JSON.stringify(item), item])).values()]

      for (const params of uniqueParamVariants) {
        try {
          const { json, url } = await wtoFetchJson("/data", params)
          probe?.urlsAttempted.push(sanitizeUrl(url))
          const latest = pickLatest(json)
          if (latest) {
            if (probe) probe.rawValue = latest
            return { ...latest, url }
          }
        } catch (e) {
          if (e instanceof WtoApiError) probe?.urlsAttempted.push(e.url)
        }
      }
      return null
    }

    let result = await attemptFetch(iso3.toUpperCase())
    if (!result) {
      const map = await getEconomyMap()
      const reporterCode = map[iso3.toUpperCase()]
      if (reporterCode && reporterCode !== iso3.toUpperCase()) {
        result = await attemptFetch(reporterCode)
      }
    }
    return result
  })()

  inflight.set(key, promise)
  promise
    .then((data) => {
      const ttl = data ? 12 * 60 * 60 * 1000 : 5 * 60 * 1000 // 12h positive, 5m negative
      resultCache.set(key, { expires: Date.now() + ttl, data })
    })
    .finally(() => inflight.delete(key))

  return promise
}

// ---------- High-Level API ----------
const indicatorCodeCache: Record<string, string | null> = {}

async function findIndicatorCode(
  labelSubstrings: string[],
  probe?: { searchStrings: string[]; matchedIndicator?: Indicator },
): Promise<string | null> {
  const cacheKey = labelSubstrings.join("|")
  if (cacheKey in indicatorCodeCache) return indicatorCodeCache[cacheKey]

  for (const substr of labelSubstrings) {
    if (probe) probe.searchStrings.push(substr)
    const results = await searchIndicatorsByLabel(substr)
    if (results.length > 0) {
      const found = results[0]
      if (probe) probe.matchedIndicator = found
      indicatorCodeCache[cacheKey] = found.code
      return found.code
    }
  }
  indicatorCodeCache[cacheKey] = null
  return null
}

export async function getMonthlyMerchandiseTrade(iso3: string, probe?: { exports: ProbeInfo; imports: ProbeInfo }) {
  const [expCode, impCode] = await Promise.all([
    findIndicatorCode(["Total merchandise exports - monthly", "Total merchandise exports - quarterly"], probe?.exports),
    findIndicatorCode(["Total merchandise imports - monthly", "Total merchandise imports - quarterly"], probe?.imports),
  ])

  const [exportsData, importsData] = await Promise.all([
    expCode ? fetchLatestValue(expCode, iso3, { needPartner: true }, probe?.exports) : null,
    impCode ? fetchLatestValue(impCode, iso3, { needPartner: true }, probe?.imports) : null,
  ])

  return {
    exports: exportsData
      ? { period: exportsData.period, valueUsdBn: toUsdBn(exportsData.value, exportsData.unit), url: exportsData.url }
      : null,
    imports: importsData
      ? { period: importsData.period, valueUsdBn: toUsdBn(importsData.value, importsData.unit), url: importsData.url }
      : null,
  }
}

export async function getMfnTariff(iso3: string, probe?: ProbeInfo) {
  const code = await findIndicatorCode(
    ["Simple average duty", "HS MFN – Simple average ad valorem duty"],
    probe ? { searchStrings: probe.urlsAttempted, matchedIndicator: undefined } : undefined,
  )
  if (!code) return null

  const data = await fetchLatestValue(code, iso3, { needProduct: true }, probe)
  return data ? { year: data.period, simpleAvgPct: data.value, url: data.url } : null
}
