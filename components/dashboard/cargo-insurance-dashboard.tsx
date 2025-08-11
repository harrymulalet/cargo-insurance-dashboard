"use client"

import { useState, useMemo, useCallback } from "react"
import { Download, BarChart3, Activity, MapIcon, BrainCircuit, PieChart } from "lucide-react"
import * as XLSX from "xlsx"

import type { NacoraDataRow, KNDataRow, ConversionMetrics, Filters, FilterOptions, RegionMetrics } from "@/lib/types"
import { standardCountries, predefinedCountryMappings, countryToRegion, fuzzyMatch } from "@/lib/country-data"

import { FileUpload } from "./file-upload"
import { FilterPanel } from "./filter-panel"
import { CountryMappingDialog } from "./country-mapping-dialog"
import { ExecutiveSummary } from "./executive-summary"
import { ConversionAnalysis } from "./conversion-analysis"
import { GeographicIntelligence } from "./geographic-intelligence"
import { Intelligence360 } from "./intelligence-360"
import { CountryInsights } from "./country-insights"

export default function CargoInsuranceDashboard() {
  const [nacoraData, setNacoraData] = useState<NacoraDataRow[]>([])
  const [knData, setKNData] = useState<KNDataRow[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("executive")
  const [filters, setFilters] = useState<Filters>({
    region: "all",
    businessUnit: "all",
    country: "all",
    dateRange: "all",
    startDate: null,
    endDate: null,
  })
  const [uploadStatus, setUploadStatus] = useState({ nacora: false, kn: false })
  const [countryMappings, setCountryMappings] = useState<Record<string, string>>({})
  const [unmatchedCountries, setUnmatchedCountries] = useState<string[]>([])
  const [showMappingDialog, setShowMappingDialog] = useState(false)

  const standardizeCountry = useCallback(
    (country: string | null, threshold = 85): string | null => {
      if (!country) return null
      const upperCountry = country.toString().toUpperCase().trim()
      if (predefinedCountryMappings[upperCountry]) return predefinedCountryMappings[upperCountry]
      if (countryMappings[upperCountry]) return countryMappings[upperCountry]
      if (standardCountries.includes(upperCountry)) return upperCountry

      let bestMatch: string | null = null
      let bestScore = 0
      for (const standardCountry of standardCountries) {
        const score = fuzzyMatch(upperCountry, standardCountry)
        if (score > bestScore) {
          bestScore = score
          bestMatch = standardCountry
        }
      }
      if (bestScore >= threshold) return bestMatch

      setUnmatchedCountries((prev) => [...new Set([...prev, upperCountry])])
      return upperCountry
    },
    [countryMappings],
  )

  const parseDate = (dateValue: any): Date | null => {
    if (!dateValue) return null
    if (typeof dateValue === "number") {
      const excelEpoch = new Date(1899, 11, 30)
      return new Date(excelEpoch.getTime() + dateValue * 86400000)
    }
    if (typeof dateValue === "string") {
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) return date
    }
    return null
  }

  const standardizeBusinessUnit = (unit: string | null): string => {
    if (!unit) return "Unknown"
    const lowerUnit = unit.toLowerCase()
    if (lowerUnit.includes("sea")) return "Sea"
    if (lowerUnit.includes("air")) return "Air"
    if (lowerUnit.includes("overland")) return "Overland"
    return "Unknown"
  }

  const processNacoraFile = async (file: File) => {
    setLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: "array" })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json<any>(sheet)

      const allCountries = new Set<string>()
      jsonData.forEach((row) => {
        if (row["Named Assured Country"]) allCountries.add(row["Named Assured Country"])
        if (row["Primary Assured Country"]) allCountries.add(row["Primary Assured Country"])
      })

      const newUnmatched = new Set<string>()
      allCountries.forEach((country) => {
        const standardized = standardizeCountry(country)
        const upperCountry = country.toString().toUpperCase().trim()
        if (
          !predefinedCountryMappings[upperCountry] &&
          !countryMappings[upperCountry] &&
          standardized === upperCountry &&
          !standardCountries.includes(standardized!)
        ) {
          newUnmatched.add(country)
        }
      })

      const processData = () => {
        const processed = jsonData.map((row): NacoraDataRow => {
          const date = parseDate(row["Date Booked"])
          const standardizedKNC = standardizeCountry(row["Primary Assured Country"])
          return {
            certificateNumber: row["Certificate Number"],
            dateBooked: date,
            monthYear: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` : null,
            totalPremiumUSD: Math.round(Number.parseFloat(row["Total Premium USD"]) || 0),
            namedAssured: row["Named Assured"] || "",
            namedAssuredCountry: standardizeCountry(row["Named Assured Country"]),
            knCountry: standardizedKNC,
            region: standardizedKNC ? countryToRegion[standardizedKNC] : row["REPORTING: NacoraRegion"],
            status: row["Status"],
            businessUnit: standardizeBusinessUnit(row["Conveyance (Custom)"]),
            isBooked: row["Status"] === "Booked",
          }
        })
        setNacoraData(processed)
        setUploadStatus((prev) => ({ ...prev, nacora: true }))
      }

      if (newUnmatched.size > 0) {
        setUnmatchedCountries(Array.from(newUnmatched))
        setShowMappingDialog(true)
      }
      processData()
    } catch (error) {
      console.error("Error processing Nacora file:", error)
      alert(`Error processing Nacora file.`)
    } finally {
      setLoading(false)
    }
  }

  const processKNFile = async (file: File) => {
    setLoading(true)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const targetSheets = ["Seafreight excl. APEX", "Airfreight excl. APEX"]
      const processedData: KNDataRow[] = []

      for (const sheetName of targetSheets) {
        if (!workbook.SheetNames.includes(sheetName)) continue
        const sheet = workbook.Sheets[sheetName]
        const rawData = XLSX.utils.sheet_to_json<any>(sheet, { header: 1 })

        const dataStartRow = rawData.findIndex(
          (r) => r[1] && (r[1].includes("Air Logistics") || r[1].includes("Sea Logistics")),
        )
        if (dataStartRow === -1) continue

        const yearRow = rawData[dataStartRow - 2]
        const monthRow = rawData[dataStartRow - 1]
        const timeColumns: { col: number; year: number; month: number }[] = []
        let currentYear: number | null = null

        for (let col = 5; col < yearRow.length; col++) {
          if (yearRow[col]) currentYear = yearRow[col]
          if (monthRow[col] && currentYear) {
            timeColumns.push({ col, year: currentYear, month: monthRow[col] })
          }
        }

        for (let i = dataStartRow; i < rawData.length; i++) {
          const row = rawData[i]
          if (!row[1] || !row[2]) continue
          const businessUnit = standardizeBusinessUnit(row[1])
          const country = standardizeCountry(row[2])
          const region = country ? countryToRegion[country] : null

          timeColumns.forEach((tc) => {
            const value = row[tc.col]
            if (value && !isNaN(value)) {
              const monthYear = `${tc.year}-${String(tc.month).padStart(2, "0")}`
              processedData.push({
                country,
                businessUnit,
                monthYear,
                shipmentCount: Number.parseInt(value) || 0,
                region,
              })
            }
          })
        }
      }
      setKNData(processedData)
      setUploadStatus((prev) => ({ ...prev, kn: true }))
    } catch (error) {
      console.error("Error processing KN file:", error)
      alert(`Error processing KN file.`)
    } finally {
      setLoading(false)
    }
  }

  const handleMappingsApplied = (newMappings: Record<string, string>) => {
    const updatedMappings = { ...countryMappings, ...newMappings }
    setCountryMappings(updatedMappings)
    setUnmatchedCountries([])
    setShowMappingDialog(false)
  }

  const filterOptions = useMemo((): FilterOptions => {
    const regions = [
      ...new Set([...nacoraData.map((d) => d.region), ...knData.map((d) => d.region)].filter(Boolean)),
    ] as string[]
    const businessUnits = [
      ...new Set([...nacoraData.map((d) => d.businessUnit), ...knData.map((d) => d.businessUnit)].filter(Boolean)),
    ] as string[]
    const countries = [
      ...new Set([...nacoraData.map((d) => d.knCountry), ...knData.map((d) => d.country)].filter(Boolean)),
    ] as string[]
    return {
      regions: regions.sort(),
      businessUnits: businessUnits.sort(),
      countries: countries.sort(),
    }
  }, [nacoraData, knData])

  const filteredData = useMemo(() => {
    let filteredNacora = [...nacoraData]
    let filteredKN = [...knData]

    // Date Filter
    let startDate: Date | null = null
    let endDate: Date | null = new Date()
    if (filters.dateRange !== "all") {
      const now = new Date()
      if (filters.dateRange === "last3months") startDate = new Date(now.setMonth(now.getMonth() - 3))
      else if (filters.dateRange === "last6months") startDate = new Date(now.setMonth(now.getMonth() - 6))
      else if (filters.dateRange === "last12months") startDate = new Date(now.setFullYear(now.getFullYear() - 1))
      else if (filters.dateRange === "ytd") startDate = new Date(now.getFullYear(), 0, 1)
      else if (filters.dateRange === "custom" && filters.startDate && filters.endDate) {
        startDate = new Date(filters.startDate)
        endDate = new Date(filters.endDate)
      }
    }

    if (startDate) {
      filteredNacora = filteredNacora.filter(
        (d) => d.dateBooked && d.dateBooked >= startDate! && d.dateBooked <= endDate,
      )
      filteredKN = filteredKN.filter((d) => {
        const [year, month] = d.monthYear.split("-").map(Number)
        const itemDate = new Date(year, month - 1, 1)
        return itemDate >= startDate! && itemDate <= endDate
      })
    }

    // Other Filters
    if (filters.region !== "all") {
      filteredNacora = filteredNacora.filter((d) => d.region === filters.region)
      filteredKN = filteredKN.filter((d) => d.region === filters.region)
    }
    if (filters.businessUnit !== "all") {
      filteredNacora = filteredNacora.filter((d) => d.businessUnit === filters.businessUnit)
      filteredKN = filteredKN.filter((d) => d.businessUnit === filters.businessUnit)
    }
    if (filters.country !== "all") {
      filteredNacora = filteredNacora.filter((d) => d.knCountry === filters.country)
      filteredKN = filteredKN.filter((d) => d.country === filters.country)
    }

    return { nacora: filteredNacora, kn: filteredKN }
  }, [nacoraData, knData, filters])

  const conversionMetrics = useMemo((): ConversionMetrics | null => {
    if (!filteredData.nacora.length || !filteredData.kn.length) return null

    const insuranceByKey: Record<string, number> = {}
    filteredData.nacora
      .filter((d) => d.isBooked)
      .forEach((policy) => {
        if (!policy.monthYear || !policy.knCountry || !policy.businessUnit) return
        const key = `${policy.monthYear}-${policy.knCountry}-${policy.businessUnit}`
        insuranceByKey[key] = (insuranceByKey[key] || 0) + 1
      })

    const conversionData = filteredData.kn.map((shipment) => {
      const key = `${shipment.monthYear}-${shipment.country}-${shipment.businessUnit}`
      const insuredCount = insuranceByKey[key] || 0
      return {
        ...shipment,
        insuredCount,
        conversionRate: shipment.shipmentCount > 0 ? (insuredCount / shipment.shipmentCount) * 100 : 0,
        opportunity: shipment.shipmentCount - insuredCount,
      }
    })

    const totalShipments = filteredData.kn.reduce((sum, d) => sum + d.shipmentCount, 0)
    const totalInsured = filteredData.nacora.filter((d) => d.isBooked).length
    const totalPremium = filteredData.nacora.filter((d) => d.isBooked).reduce((sum, d) => sum + d.totalPremiumUSD, 0)

    const regionMetrics: Record<string, RegionMetrics> = {}
    conversionData.forEach((d) => {
      if (!d.region) return
      if (!regionMetrics[d.region])
        regionMetrics[d.region] = {
          totalShipments: 0,
          insuredShipments: 0,
          totalPremium: 0,
          bookedShipments: 0,
          conversionRate: 0,
          bookedPolicies: 0,
        }
      regionMetrics[d.region].totalShipments += d.shipmentCount
      regionMetrics[d.region].insuredShipments += d.insuredCount
    })
    filteredData.nacora
      .filter((d) => d.isBooked)
      .forEach((d) => {
        if (!d.region) return
        if (!regionMetrics[d.region])
          regionMetrics[d.region] = {
            totalShipments: 0,
            insuredShipments: 0,
            totalPremium: 0,
            bookedShipments: 0,
            conversionRate: 0,
            bookedPolicies: 0,
          }
        regionMetrics[d.region].totalPremium += d.totalPremiumUSD
        regionMetrics[d.region].bookedPolicies++
      })
    Object.values(regionMetrics).forEach((metrics) => {
      metrics.conversionRate =
        metrics.totalShipments > 0 ? (metrics.insuredShipments / metrics.totalShipments) * 100 : 0
    })

    return {
      totalShipments,
      totalInsured,
      overallConversionRate: totalShipments > 0 ? (totalInsured / totalShipments) * 100 : 0,
      conversionData,
      regionMetrics,
      totalPremium,
    }
  }, [filteredData])

  const exportReport = () => {
    if (!conversionMetrics) return
    const reportWindow = window.open("", "_blank")
    if (!reportWindow) return

    const reportDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    const filterSummary = Object.entries(filters)
      .filter(([, val]) => val && val !== "all")
      .map(([key, val]) => `${key}: ${val}`)
      .join(" | ")

    const regionalTableRows = Object.entries(conversionMetrics.regionMetrics)
      .map(
        ([region, metrics]) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${region}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${metrics.totalShipments.toLocaleString()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${metrics.insuredShipments.toLocaleString()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${metrics.conversionRate.toFixed(1)}%</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${metrics.totalPremium.toLocaleString()}</td>
        </tr>
      `,
      )
      .join("")

    const reportHTML = `
      <!DOCTYPE html><html><head><title>Report</title><style>body{font-family:sans-serif} table{width:100%; border-collapse:collapse;} th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd;}</style></head><body>
      <h1>Global Cargo Insurance Analytics Report</h1><p>Generated: ${reportDate}</p><p>Filters: ${filterSummary || "None"}</p>
      <h2>Executive Summary</h2>
      <p>Overall Conversion Rate: <strong>${conversionMetrics.overallConversionRate.toFixed(1)}%</strong></p>
      <p>Total Premium Volume: <strong>$${(conversionMetrics.totalPremium / 1_000_000).toFixed(1)}M</strong></p>
      <p>Active Policies: <strong>${conversionMetrics.totalInsured.toLocaleString()}</strong></p>
      <h2>Regional Performance</h2><table><thead><tr><th>Region</th><th>Total Shipments</th><th>Insured</th><th>Conv. Rate</th><th>Premium</th></tr></thead><tbody>${regionalTableRows}</tbody></table>
      </body></html>`

    reportWindow.document.write(reportHTML)
    reportWindow.document.close()
    reportWindow.print()
  }

  const renderContent = () => {
    if (!uploadStatus.nacora || !uploadStatus.kn) {
      return (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Data Files</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FileUpload
              title="Nacora Insurance Report"
              onFileSelect={processNacoraFile}
              isUploaded={uploadStatus.nacora}
            />
            <FileUpload title="KN Shipments Report" onFileSelect={processKNFile} isUploaded={uploadStatus.kn} />
          </div>
        </div>
      )
    }

    const tabContent = {
      executive: <ExecutiveSummary metrics={conversionMetrics} filteredData={filteredData} />,
      conversion: <ConversionAnalysis metrics={conversionMetrics} />,
      geographic: <GeographicIntelligence metrics={conversionMetrics} filteredData={filteredData} />,
      intelligence: <Intelligence360 metrics={conversionMetrics} filteredData={filteredData} />,
      countryInsights: (
        <CountryInsights conversionMetrics={conversionMetrics} filters={filters} filteredData={filteredData} />
      ),
    }

    return (
      <>
        <div className="mb-6">
          <nav className="flex space-x-1 border-b">
            <button
              onClick={() => setActiveTab("executive")}
              className={`px-4 py-2 font-medium transition-colors rounded-t-md ${activeTab === "executive" ? "border-b-2 border-blue-600 text-blue-600 bg-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              <BarChart3 className="inline w-4 h-4 mr-2" />
              Executive Summary
            </button>
            <button
              onClick={() => setActiveTab("conversion")}
              className={`px-4 py-2 font-medium transition-colors rounded-t-md ${activeTab === "conversion" ? "border-b-2 border-blue-600 text-blue-600 bg-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Activity className="inline w-4 h-4 mr-2" />
              Conversion Analysis
            </button>
            <button
              onClick={() => setActiveTab("geographic")}
              className={`px-4 py-2 font-medium transition-colors rounded-t-md ${activeTab === "geographic" ? "border-b-2 border-blue-600 text-blue-600 bg-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              <MapIcon className="inline w-4 h-4 mr-2" />
              Geographic Intelligence
            </button>
            <button
              onClick={() => setActiveTab("intelligence")}
              className={`px-4 py-2 font-medium transition-colors rounded-t-md ${activeTab === "intelligence" ? "border-b-2 border-blue-600 text-blue-600 bg-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              <BrainCircuit className="inline w-4 h-4 mr-2" />
              360° Intelligence
            </button>
            <button
              onClick={() => setActiveTab("countryInsights")}
              className={`px-4 py-2 font-medium transition-colors rounded-t-md ${activeTab === "countryInsights" ? "border-b-2 border-blue-600 text-blue-600 bg-white" : "text-gray-500 hover:text-gray-700"}`}
            >
              <PieChart className="inline w-4 h-4 mr-2" />
              Country Insights
            </button>
          </nav>
        </div>
        <FilterPanel filters={filters} setFilters={setFilters} options={filterOptions} />
        <div className="mb-8">{tabContent[activeTab as keyof typeof tabContent]}</div>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CountryMappingDialog
        isOpen={showMappingDialog}
        onClose={() => setShowMappingDialog(false)}
        unmatchedCountries={unmatchedCountries}
        onApply={handleMappingsApplied}
      />
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Global Cargo Insurance Analytics</h1>
              <p className="text-sm text-gray-600 mt-1">Nacora Insurance Brokers - Kuehne Nagel Partnership</p>
            </div>
            <button
              onClick={exportReport}
              disabled={!conversionMetrics}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300"
            >
              <Download className="w-4 h-4 mr-2" /> Export Report
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Processing data, please wait...</p>
            </div>
          </div>
        )}
        {renderContent()}
      </main>
    </div>
  )
}
