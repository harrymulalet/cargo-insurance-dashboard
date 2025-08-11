"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import type { ConversionMetrics, Filters, NacoraDataRow, KNDataRow, ExternalTradeData } from "@/lib/types"
import Chart from "./chart"
import { KPICard } from "./kpi-card"
import { Package, TrendingUp, DollarSign, AlertCircle, Ship, Percent, Globe } from "lucide-react"
import { countryNameToIso3 } from "@/lib/country-iso-map"

// --- Sub-components for the Country Insights Tab ---

const ExternalDataDisplay: React.FC<{ country: string; data?: ExternalTradeData; isLoading: boolean }> = ({
  country,
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-2">Loading external data...</p>
        </div>
      </div>
    )
  }

  const renderValue = (value: number | undefined, unit: string, period?: string | number) => {
    if (value !== undefined && period) {
      return (
        <td className="py-1 text-right">
          <span className="font-semibold">{`${value.toLocaleString(undefined, {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })} ${unit}`}</span>
          <p className="text-xs text-gray-400 -mt-1">as of {period}</p>
        </td>
      )
    }
    return (
      <td className="py-1 text-right">
        <span className="font-semibold text-gray-500">N/A</span>
        <p className="text-xs text-gray-400 -mt-1">Data unavailable</p>
      </td>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-3">{country} – External Trade Snapshot</h3>
      <table className="min-w-full text-sm text-left text-gray-700">
        <thead>
          <tr className="border-b">
            <th className="py-2 pr-4 font-medium flex items-center gap-2">
              <Ship size={16} />
              Merchandise Trade
            </th>
            <th className="py-2 font-medium text-right">Value (USD)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2 pr-4">Exports (Monthly/Quarterly)</td>
            {renderValue(
              data?.monthlyMerchandise?.exports?.valueUsdBn,
              "bn",
              data?.monthlyMerchandise?.exports?.period,
            )}
          </tr>
          <tr>
            <td className="py-2 pr-4">Imports (Monthly/Quarterly)</td>
            {renderValue(
              data?.monthlyMerchandise?.imports?.valueUsdBn,
              "bn",
              data?.monthlyMerchandise?.imports?.period,
            )}
          </tr>
        </tbody>
      </table>

      {(data?.mfnTariff || data?.tradeOpenness) && (
        <table className="min-w-full text-sm text-left text-gray-700 mt-4">
          <thead>
            <tr className="border-b">
              <th className="py-2 pr-4 font-medium flex items-center gap-2">
                <Globe size={16} />
                Trade Policy & Context
              </th>
              <th className="py-2 font-medium text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {data?.mfnTariff && (
              <tr className="border-b">
                <td className="py-2 pr-4 flex items-center gap-2">
                  <Percent size={14} /> MFN Tariff (Simple Avg.)
                </td>
                {renderValue(data.mfnTariff.simpleAvgPct, "%", data.mfnTariff.year)}
              </tr>
            )}
            {data?.tradeOpenness && (
              <tr>
                <td className="py-2 pr-4">Trade Openness (% of GDP)</td>
                {renderValue(data.tradeOpenness.value, "%", data.tradeOpenness.year)}
              </tr>
            )}
          </tbody>
        </table>
      )}
      <p className="text-xs text-gray-400 mt-2">Sources: World Trade Organization (WTO), World Bank.</p>
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
  const [externalDataCache, setExternalDataCache] = useState<Record<string, ExternalTradeData>>({})
  const [loadingCountries, setLoadingCountries] = useState<Record<string, boolean>>({})

  const countries = useMemo(() => {
    if (!conversionMetrics) return []
    return [...new Set(conversionMetrics.conversionData.map((d) => d.country).filter(Boolean))].sort() as string[]
  }, [conversionMetrics])

  useEffect(() => {
    countries.forEach(async (country) => {
      const iso3 = countryNameToIso3[country]
      if (!iso3) return

      if (!externalDataCache[iso3] && !loadingCountries[iso3]) {
        setLoadingCountries((prev) => ({ ...prev, [iso3]: true }))
        try {
          const res = await fetch(`/api/wto?iso3=${iso3}`)
          if (res.ok) {
            const json: ExternalTradeData = await res.json()
            setExternalDataCache((prev) => ({ ...prev, [iso3]: json }))
          } else {
            console.warn(`External data API route for ${iso3} returned non-OK:`, res.status)
            setExternalDataCache((prev) => ({ ...prev, [iso3]: { iso3 } as ExternalTradeData }))
          }
        } catch (e) {
          console.error(`Failed to load external data for ${iso3}:`, e)
          setExternalDataCache((prev) => ({ ...prev, [iso3]: { iso3 } as ExternalTradeData }))
        } finally {
          setLoadingCountries((prev) => ({ ...prev, [iso3]: false }))
        }
      }
    })
  }, [countries, externalDataCache, loadingCountries])

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
        const externalData = iso3 ? externalDataCache[iso3] : undefined
        const isLoading = iso3 ? loadingCountries[iso3] : false

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
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-lg font-semibold mb-4">Strategic Insights</h3>
                  <ul className="space-y-3 text-sm">
                    <li className="flex items-start gap-3">
                      <strong className="text-blue-600 font-bold mt-1">›</strong>
                      <span>
                        Focus on increasing conversion for <strong>Sea</strong> and <strong>Air</strong> logistics,
                        where volume is highest.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <strong className="text-green-600 font-bold mt-1">›</strong>
                      <span>Leverage high average premium per shipment to offer tiered insurance products.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <strong className="text-orange-600 font-bold mt-1">›</strong>
                      <span>
                        Compare internal conversion trends against the country's overall trade openness to identify
                        market potential.
                      </span>
                    </li>
                  </ul>
                </div>
                <ExternalDataDisplay country={country} data={externalData} isLoading={!!isLoading} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
