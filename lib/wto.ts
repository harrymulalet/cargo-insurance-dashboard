// lib/wto.ts
// Reliable WTO fetch for Merchandise Exports/Imports (annual).
// Indicators: ITS_MTV_AX (exports), ITS_MTV_AM (imports)
type LatestPoint = { year: number; value: number; unit?: string; url: string }
type MarketTrade = {
  exportsUsdBn?: number
  exportsYear?: number
  exportsUrl?: string
  importsUsdBn?: number
  importsYear?: number
  importsUrl?: string
}

const WTO_BASE = "https://api.wto.org/timeseries/v1"
const COMMON = { fmt: "json", mode: "full", lang: "1", meta: "false" } as const

// ---------- helpers ----------
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))
const nowYear = () => new Date().getFullYear()
const jitter = (ms: number) => ms + Math.floor(Math.random() * 100)

function sanitizeUrl(u: string) {
  try {
    const x = new URL(u)
    x.searchParams.delete("subscription-key")
    return x.toString()
  } catch {
    return u
  }
}

// Small concurrency gate to avoid bursts
let inFlightCount = 0
const MAX_PARALLEL = 2
async function gate<T>(fn: () => Promise<T>): Promise<T> {
  while (inFlightCount >= MAX_PARALLEL) await sleep(50)
  inFlightCount++
  try {
    return await fn()
  } finally {
    inFlightCount--
  }
}

// ---------- resilient fetch with retries & key failover ----------
async function wtoFetchJson(
  path: string,
  params: Record<string, string | number>,
): Promise<{ json: any; url: string }> {
  const key1 = process.env.WTO_API_KEY_PRIMARY || ""
  const key2 = process.env.WTO_API_KEY_SECONDARY || ""

  const attempt = async (key: string): Promise<Response> => {
    const u = new URL(WTO_BASE + path)
    Object.entries({ ...COMMON, ...params }).forEach(([k, v]) => u.searchParams.set(k, String(v)))
    if (key) u.searchParams.set("subscription-key", key)
    return fetch(u.toString(), { headers: { Accept: "application/json" }, cache: "no-store" })
  }

  let lastErr: any
  let lastUrl = ""

  return gate(async () => {
    for (let pass = 0; pass < 2; pass++) {
      // key1 then key2
      const key = pass === 0 ? key1 : key2
      if (!key) {
        if (pass === 0) continue
        else break
      }
      for (let i = 0; i < 4; i++) {
        // retries
        const u = new URL(WTO_BASE + path)
        Object.entries({ ...COMMON, ...params }).forEach(([k, v]) => u.searchParams.set(k, String(v)))
        u.searchParams.set("subscription-key", key)
        lastUrl = u.toString()
        try {
          const res = await attempt(key)
          const ct = res.headers.get("content-type") || ""
          if (res.status === 429 || res.status === 503) {
            const backoff = jitter([500, 1000, 2000, 4000][i] || 4000)
            await sleep(backoff)
            continue
          }
          if (!res.ok) {
            lastErr = new Error(`WTO ${res.status}`)
            if (i < 3) continue
            break
          }
          if (!/json/i.test(ct)) {
            const txt = (await res.text()).slice(0, 200)
            throw new Error(`WTO non-JSON (${res.status}): ${txt}`)
          }
          return { json: await res.json(), url: lastUrl }
        } catch (e) {
          lastErr = e
          if (i < 3) {
            await sleep(jitter([500, 1000, 2000, 4000][i] || 4000))
            continue
          }
        }
      }
    }
    throw Object.assign(
      new Error(`WTO fetch failed: ${String(lastErr?.message || lastErr)} :: ${sanitizeUrl(lastUrl)}`),
      {
        cause: lastErr,
      },
    )
  })
}

// ---------- economy map (optional, with circuit breaker) ----------
let economyMapPromise: Promise<Record<string, string>> | null = null
let economiesBlockedUntil = 0

async function getEconomyMap(): Promise<Record<string, string>> {
  const now = Date.now()
  if (now < economiesBlockedUntil) return {} // circuit breaker
  if (!economyMapPromise) {
    economyMapPromise = (async () => {
      try {
        const { json } = await wtoFetchJson("/economies", {})
        const rows = json?.Dataset ?? json?.dataset ?? []
        const map: Record<string, string> = {}
        for (const r of rows) {
          const a3 = String(r.Alpha3Code || r.Alpha3 || r["Alpha-3"] || r.Code || "").toUpperCase()
          const code = String(r.Code || r.Id || r.code || "")
          if (a3 && code) map[a3] = code
        }
        return map
      } catch (e: any) {
        // If 429 or non-JSON, trip the breaker for 15 minutes
        economiesBlockedUntil = Date.now() + 15 * 60 * 1000
        return {}
      }
    })()
  }
  return economyMapPromise
}

// ---------- parsing & conversion ----------
function pickLatestFromDataset(json: any): { year: number; value: number; unit?: string } | null {
  const seriesArr = json?.Dataset
  if (!Array.isArray(seriesArr) || seriesArr.length === 0) return null
  let best: { year: number; value: number; unit?: string } | null = null
  for (const s of seriesArr) {
    const unit = s?.Unit || s?.unit
    const rows = Array.isArray(s?.Data)
      ? s.Data
      : Array.isArray(s?.Value)
        ? s.Value
        : Array.isArray(json?.Value)
          ? json.Value
          : []
    for (const r of rows) {
      const yRaw = r.TIME_PERIOD ?? r.Time ?? r.Period ?? r.Year ?? r.TIME
      const vRaw = r.Value ?? r.OBS_VALUE ?? r.VALUE ?? r.value
      const year = Number(String(yRaw ?? "").slice(0, 4))
      const value = Number(vRaw)
      if (!Number.isFinite(year) || !Number.isFinite(value)) continue
      if (!best || year > best.year) best = { year, value, unit }
    }
  }
  return best
}

function toUsdBn(value: number, unit?: string): number {
  const u = (unit || "").toLowerCase()
  if (u.includes("million")) return +(value / 1_000).toFixed(1)
  if (u.includes("thousand")) return +(value / 1_000_000).toFixed(1)
  if (u.includes("billion")) return +value.toFixed(1)
  return +(value / 1_000_000_000).toFixed(1)
}

// ---------- core WTO query (no economies call unless needed) ----------
const dimCandidates: Record<string, string | number>[] = [{ p: "000" }, { p: "000", px: "TO" }, { p: "000", pc: "TO" }]

async function tryData(indicator: string, reporter: string, ps: string) {
  for (const dims of dimCandidates) {
    try {
      const { json, url } = await wtoFetchJson("/data", { i: indicator, r: reporter, ps, ...dims })
      const pt = pickLatestFromDataset(json)
      if (pt) return { pt, url }
    } catch {
      // continue to next candidate
    }
  }
  return null
}

const resultCache = new Map<string, { expires: number; data: LatestPoint | null }>()
const inflight = new Map<string, Promise<LatestPoint | null>>()

async function getLatestWto(indicator: string, iso3: string): Promise<LatestPoint | null> {
  const key = `${indicator}|${iso3}`
  const cached = resultCache.get(key)
  if (cached && cached.expires > Date.now()) return cached.data

  if (inflight.has(key)) return inflight.get(key)!

  const promise = (async (): Promise<LatestPoint | null> => {
    const ps = `${nowYear() - 6}:${nowYear()}`
    // 1) try ISO3 directly
    try {
      const res = await tryData(indicator, iso3, ps)
      if (res?.pt) {
        const out = { year: res.pt.year, value: res.pt.value, unit: res.pt.unit, url: res.url }
        resultCache.set(key, { expires: Date.now() + 12 * 60 * 60 * 1000, data: out })
        return out
      }
    } catch {
      /* continue */
    }
    // 2) optional: map via /economies and retry once
    try {
      const map = await getEconomyMap()
      const reporter = map[iso3.toUpperCase()]
      if (reporter && reporter !== iso3) {
        const res2 = await tryData(indicator, reporter, ps)
        if (res2?.pt) {
          const out = { year: res2.pt.year, value: res2.pt.value, unit: res2.pt.unit, url: res2.url }
          resultCache.set(key, { expires: Date.now() + 12 * 60 * 60 * 1000, data: out })
          return out
        }
      }
    } catch {
      /* ignore; return null */
    }
    resultCache.set(key, { expires: Date.now() + 30 * 60 * 1000, data: null }) // short negative TTL
    return null
  })()

  inflight.set(key, promise)
  try {
    return await promise
  } finally {
    inflight.delete(key)
  }
}

// ---------- public API ----------
export async function fetchWtoCountryTrade(iso3: string): Promise<MarketTrade> {
  const [exp, imp] = await Promise.all([getLatestWto("ITS_MTV_AX", iso3), getLatestWto("ITS_MTV_AM", iso3)])
  const out: MarketTrade = {}
  if (exp) {
    out.exportsUsdBn = toUsdBn(exp.value, exp.unit)
    out.exportsYear = exp.year
    out.exportsUrl = exp.url
  }
  if (imp) {
    out.importsUsdBn = toUsdBn(imp.value, imp.unit)
    out.importsYear = imp.year
    out.importsUrl = imp.url
  }
  return out
}
