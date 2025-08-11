"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import type { ConversionMetrics, Filters, NacoraDataRow, KNDataRow } from "@/lib/types"
import Chart from "./chart"
import { KPICard } from "./kpi-card"
import { Package, TrendingUp, DollarSign, AlertCircle, Info } from "lucide-react"
import type { MarketOverview } from "@/lib/wto" // type-only import to avoid runtime server code on client
import { countryNameToIso3 } from "@/lib/country-iso-map"

// --- Interfaces for external data ---
interface RiskType {
  economic: number
  political: number
  operational: number
}

// --- API Fetcher Stub (keep as placeholder for risk) ---
async function fetchRiskData(countryCode: string): Promise<RiskType> {
  return Promise.resolve({
    economic: Math.random() * 6 + 2,
    political: Math.random() * 7 + 1,
    operational: Math.random() * 5 + 3,
  })
}

// --- Sub-components for the Country Insights Tab ---

const MarketOverviewTable: React.FC<{ country: string; data?: MarketOverview }> = ({ country, data }) => {
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading trade data...</p>
      </div>
    )
  }

  const formatValue = (value: number | undefined) =>
    value?.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) || "N/A"

  const SourceTooltip: React.FC<{ url?: string; children: React.ReactNode }> = ({ url, children }) => (
    <span className="relative group">
      {children}
      {url && <Info className="inline-block w-3 h-3 ml-1 text-gray-400 group-hover:text-blue-600" />}
      {url && (
        <span className="absolute bottom-full mb-2 w-64 p-2 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {"Source: "}
          {url.split("?")[0]}
        </span>
      )}
    </span>
  )

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-3">{country} – Market Overview</h3>
      <table className="min-w-full text-sm text-left text-gray-700">
        <thead className="text-gray-500 border-b">
          <tr>
            <th className="py-2 pr-4 font-medium">Indicator</th>
            <th className="py-2 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2 pr-4">
              <SourceTooltip url={data.sources.imports}>
                Merchandise Imports {data.importsYear && `(${data.importsYear})`}
              </SourceTooltip>
            </td>
            <td className="py-2 font-semibold">
              {data.importsUsdBn !== undefined ? `${formatValue(data.importsUsdBn)} bn` : "N/A"}
            </td>
          </tr>
          <tr className="border-b">
            <td className="py-2 pr-4">
              <SourceTooltip url={data.sources.exports}>
                Merchandise Exports {data.exportsYear && `(${data.exportsYear})`}
              </SourceTooltip>
            </td>
            <td className="py-2 font-semibold">
              {data.exportsUsdBn !== undefined ? `${formatValue(data.exportsUsdBn)} bn` : "N/A"}
            </td>
          </tr>
          <tr>
            <td className="py-2 pr-4">
              <SourceTooltip url={data.sources.openness}>
                Trade Openness {data.tradeOpennessYear && `(${data.tradeOpennessYear})`}
              </SourceTooltip>
            </td>
            <td className="py-2 font-semibold">
              {data.tradeOpennessPct !== undefined ? `${formatValue(data.tradeOpennessPct)}%` : "N/A"}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2">Trade data from WTO, openness from World Bank.</p>
    </div>
  )
}

const RiskProfile: React.FC<{ country: string; risk?: RiskType }> = ({ country, risk }) => {
  const categories = ["Economic", "Political", "Operational"]
  const values = risk ? [risk.economic, risk.political, risk.operational] : [0, 0, 0]
  const chartData = [
    {
      type: "scatterpolar",
      r: [...values, values[0]],
      theta: [...categories, categories[0]],
      fill: "toself",
      name: country,
      marker: { color: "rgba(40, 140, 250, 0.6)" },
    },
  ] as any[]
  const chartLayout: any = {
    title: "Risk Profile",
    polar: { radialaxis: { visible: true, range: [0, 10] } },
    showlegend: false,
    height: 300,
    margin: { t: 50, r: 50, b: 50, l: 50 },
  }

  if (!risk) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 h-full flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading risk data...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <Chart data={chartData} layout={chartLayout} className="h-[300px]" />
      <p className="mt-2 text-xs text-gray-600 text-center">
        {"Risk scores (0=low to 10=high): Economic "}
        {risk.economic.toFixed(1)}
        {", Political "}
        {risk.political.toFixed(1)}
        {", Operational "}
        {risk.operational.toFixed(1)}
      </p>
    </div>
  )
}

const CountryCharts: React.FC<{ data: any[]; country: string }> = ({ data, country }) => {
  const { convChartProps, shipChartProps } = useMemo(() => {
    if (!data || data.length === 0) return { convChartProps: null, shipChartProps: null }

    const monthlyData: Record<string, { shipments: number; insured: number }> = {}
    data.forEach((record) => {
      const { monthYear, shipmentCount, insuredCount } = record
      if (!monthlyData[monthYear]) monthlyData[monthYear] = { shipments: 0, insured: 0 }
      monthlyData[monthYear].shipments += shipmentCount
      monthlyData[monthYear].insured += insuredCount
    })
    const months = Object.keys(monthlyData).sort()
    const shipments = months.map((m) => monthlyData[m].shipments)
    const conversionRates = months.map((m) => {
      const { shipments, insured } = monthlyData[m]
      return shipments > 0 ? (insured / shipments) * 100 : 0
    })

    const convChartProps = {
      data: [
        {
          x: months,
          y: conversionRates,
          type: "scatter",
          mode: "lines+markers",
          name: "Conversion Rate",
          line: { color: "#288cfa", width: 3 },
        },
      ],
      layout: {
        title: "Conversion Rate Trend (%)",
        yaxis: { title: "Rate (%)", rangemode: "tozero" },
        height: 350,
        margin: { t: 50, r: 30, b: 50, l: 50 },
      },
    }
    const shipChartProps = {
      data: [{ x: months, y: shipments, type: "bar", name: "Total Shipments", marker: { color: "#38ce3c" } }],
      layout: {
        title: "Shipment Volume Over Time",
        yaxis: { title: "Shipments", rangemode: "tozero" },
        height: 350,
        margin: { t: 50, r: 30, b: 50, l: 50 },
      },
    }
    return { convChartProps, shipChartProps }
  }, [data])

  if (!convChartProps) return null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <Chart data={convChartProps.data} layout={convChartProps.layout} className="h-[350px]" />
      </div>
      <div className="bg-white rounded-lg shadow-md p-4">
        <Chart data={shipChartProps.data} layout={shipChartProps.layout} className="h-[350px]" />
      </div>
    </div>
  )
}

// --- Main CountryInsights Component ---

interface CountryInsightsProps {
  conversionMetrics: ConversionMetrics | null
  filters: Filters
  filteredData: { nacora: NacoraDataRow[]; kn: KNDataRow[] }
}

const formatPremiumValue = (value: number): string => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`
  }
  return `$${value.toLocaleString()}`
}

export function CountryInsights({ conversionMetrics, filters, filteredData }: CountryInsightsProps) {
  const [marketOverviewCache, setMarketOverviewCache] = useState<Record<string, MarketOverview>>({})
  const [riskCache, setRiskCache] = useState<Record<string, RiskType>>({})

  const countries = useMemo(() => {
    if (!conversionMetrics) return []
    return [...new Set(conversionMetrics.conversionData.map((d) => d.country).filter(Boolean))].sort() as string[]
  }, [conversionMetrics])

  useEffect(() => {
    countries.forEach(async (country) => {
      const iso3 = countryNameToIso3[country]
      if (!iso3) return

      if (!marketOverviewCache[iso3]) {
        try {
          const res = await fetch(`/api/wto?iso3=${iso3}`)
          if (res.ok) {
            const json: MarketOverview = await res.json()
            setMarketOverviewCache((prev) => ({ ...prev, [iso3]: json }))
          } else {
            console.warn("WTO API route returned non-OK:", res.status)
          }
        } catch (e) {
          console.error("Failed to load WTO market overview:", e)
        }
      }

      if (!riskCache[country]) {
        fetchRiskData(country).then((data) => setRiskCache((prev) => ({ ...prev, [country]: data })))
      }
    })
  }, [countries, marketOverviewCache, riskCache])

  const premiumLabelSuffix = useMemo(() => {
    const { kn } = filteredData
    if (!kn || kn.length === 0) {
      const dateRangeLabels: Record<string, string> = {
        all: "All Time",
        ytd: "YTD",
        last3months: "Last 3 Months",
        last6months: "Last 6 Months",
        last12months: "Last 12 Months",
        custom: "Custom Range",
      }
      return dateRangeLabels[filters.dateRange] || "All Time"
    }

    const dates = kn.map((d) => {
      const [year, month] = d.monthYear.split("-").map(Number)
      return new Date(year, month - 1, 1)
    })

    const minDate = dates.reduce((a, b) => (a < b ? a : b))
    const maxDate = dates.reduce((a, b) => (a > b ? a : b))

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    }

    const minDateStr = formatDate(minDate)
    const maxDateStr = formatDate(maxDate)

    if (minDateStr === maxDateStr) {
      return `${minDateStr}`
    }

    return `${minDateStr} - ${maxDateStr}`
  }, [filteredData, filters.dateRange])

  if (!conversionMetrics || countries.length === 0) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg text-gray-600">No country data available for the selected filters.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {countries.map((country) => {
        const countryConversionData = conversionMetrics.conversionData.filter((d) => d.country === country)
        const countryNacoraData = filteredData.nacora.filter((d) => d.knCountry === country)

        const totalShipments = countryConversionData.reduce((sum, d) => sum + d.shipmentCount, 0)
        const insuredShipments = countryConversionData.reduce((sum, d) => sum + d.insuredCount, 0)
        const conversionRate = totalShipments > 0 ? (insuredShipments / totalShipments) * 100 : 0
        const totalPremium = countryNacoraData.filter((d) => d.isBooked).reduce((sum, d) => sum + d.totalPremiumUSD, 0)

        const kpiCards = [
          { title: "Total Shipments", value: totalShipments.toLocaleString(), icon: Package },
          { title: "Insured Shipments", value: insuredShipments.toLocaleString(), icon: Package },
          { title: "Conversion Rate", value: `${conversionRate.toFixed(1)}%`, icon: TrendingUp },
          {
            title: `Premium Volume (${premiumLabelSuffix})`,
            value: formatPremiumValue(totalPremium),
            icon: DollarSign,
          },
        ]

        const iso3 = countryNameToIso3[country]
        const marketData = iso3 ? marketOverviewCache[iso3] : undefined
        const riskData = riskCache[country]

        return (
          <div key={country} className="bg-gray-100 p-4 sm:p-6 rounded-lg shadow-inner border">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-b pb-3">{country}</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiCards.map((kpi) => (
                  <KPICard key={kpi.title} {...kpi} />
                ))}
              </div>
              <CountryCharts data={countryConversionData} country={country} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RiskProfile country={country} risk={riskData} />
                <MarketOverviewTable country={country} data={marketData} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
