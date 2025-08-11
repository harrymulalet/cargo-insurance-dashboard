export interface NacoraDataRow {
  certificateNumber: string
  dateBooked: Date | null
  monthYear: string | null
  totalPremiumUSD: number
  namedAssured: string
  namedAssuredCountry: string | null
  knCountry: string | null
  region: string | null
  status: string
  businessUnit: string
  isBooked: boolean
}

export interface KNDataRow {
  country: string | null
  businessUnit: string
  monthYear: string
  shipmentCount: number
  region: string | null
}

export interface ConversionData extends KNDataRow {
  insuredCount: number
  conversionRate: number
  opportunity: number
}

export interface RegionMetrics {
  totalShipments: number
  insuredShipments: number
  totalPremium: number
  conversionRate: number
  bookedShipments: number // From Nacora data
  bookedPolicies: number // Added for avg premium calculation
}

export interface ConversionMetrics {
  totalShipments: number
  totalInsured: number
  overallConversionRate: number
  conversionData: ConversionData[]
  regionMetrics: Record<string, RegionMetrics>
  totalPremium: number
}

export interface Filters {
  region: string
  businessUnit: string
  country: string
  dateRange: string
  startDate: string | null
  endDate: string | null
}

export interface FilterOptions {
  regions: string[]
  businessUnits: string[]
  countries: string[]
}

// Types for 360° Intelligence
export interface CustomerData {
  customer: string
  country: string | null
  businessUnit: string
  totalShipments: number
  insuredShipments: number
  monthlyShipments: number[]
  annualShipments: number
  conversionRate: number
}

export interface CustomerCluster {
  min: number
  max: number
  label: string
  customers: CustomerData[]
  totalShipments: number
  insuredShipments: number
  conversionRate: number
  customerCount: number
}

export interface MarketShareData {
  country: string
  nacoraPremium: number
  estimatedMarketSize: number
  marketShare: number
}

export interface TopCustomerData {
  customer: string
  country: string | null
  businessUnit: string
  totalPremium: number
  shipmentCount: number
  avgPremium: number
}

export interface SynergyData {
  country: string
  totalShipments: number
  insuredShipments: number
  conversionRate: number
  conversionGap: number
  synergyScore: number
  potentialRebate: number
}

export interface IntelligenceMetrics {
  clusters: Record<string, CustomerCluster>
  marketShareByCountry: MarketShareData[]
  topCustomers: TopCustomerData[]
  synergyMatrix: SynergyData[]
  globalMetrics: {
    totalMarketSize: number
    nacoraMarketShare: number
  }
}

// Types for External Data APIs
export interface WtoApiValue {
  period?: string | number
  year?: string | number
  valueUsdBn?: number
  simpleAvgPct?: number
  url?: string
}

export interface ExternalTradeData {
  iso3: string
  monthlyMerchandise?: {
    exports: WtoApiValue | null
    imports: WtoApiValue | null
  }
  mfnTariff?: WtoApiValue | null
  tradeOpenness?: {
    year: number
    value: number
    url: string
  }
}
