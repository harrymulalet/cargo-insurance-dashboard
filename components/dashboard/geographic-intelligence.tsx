"use client";

import React, { useMemo } from 'react';
import { AlertCircle, Globe, MapPin, ShieldAlert, PieChart } from 'lucide-react';
import type { ConversionMetrics, NacoraDataRow, KNDataRow } from '@/lib/types';
import Chart from './chart';
import { KPICard } from './kpi-card';

interface GeographicIntelligenceProps {
  metrics: ConversionMetrics | null;
  filteredData: { nacora: NacoraDataRow[], kn: KNDataRow[] };
}

export function GeographicIntelligence({ metrics, filteredData }: GeographicIntelligenceProps) {
  const { charts, tableData, kpis } = useMemo(() => {
    if (!metrics) return { charts: null, tableData: [], kpis: null };

    const geoData: Record<string, { shipments: number; insured: number; premium: number }> = {};

    filteredData.kn.forEach(d => {
      if (!d.country) return;
      if (!geoData[d.country]) geoData[d.country] = { shipments: 0, insured: 0, premium: 0 };
      geoData[d.country].shipments += d.shipmentCount;
    });

    filteredData.nacora.filter(d => d.isBooked).forEach(d => {
      if (!d.knCountry) return;
      if (!geoData[d.knCountry]) geoData[d.knCountry] = { shipments: 0, insured: 0, premium: 0 };
      geoData[d.knCountry].insured++;
      geoData[d.knCountry].premium += d.totalPremiumUSD;
    });

    const tableData = Object.entries(geoData).map(([country, data]) => ({
      country, ...data,
      conversionRate: data.shipments > 0 ? (data.insured / data.shipments) * 100 : 0,
      avgPremium: data.insured > 0 ? data.premium / data.insured : 0
    })).sort((a, b) => b.shipments - a.shipments);

    const topCountries = tableData.slice(0, 15);
    const countryVolumeChart = {
      data: [
        { x: topCountries.map(c => c.country), y: topCountries.map(d => d.shipments), type: 'bar', name: 'Total Shipments' },
        { x: topCountries.map(c => c.country), y: topCountries.map(d => d.insured), type: 'bar', name: 'Insured Shipments' }
      ],
      layout: { title: 'Top 15 Countries by Shipment Volume', barmode: 'group', height: 400, margin: { t: 40, r: 40, b: 120, l: 60 } }
    };

    const regionRiskData = Object.entries(metrics.regionMetrics).map(([region, data]) => ({
      region,
      conversionRate: data.conversionRate,
      avgPremium: data.bookedPolicies > 0 ? data.totalPremium / data.bookedPolicies : 0,
      volume: data.bookedPolicies
    }));
    const riskMatrixChart = {
      data: [{ x: regionRiskData.map(d => d.conversionRate), y: regionRiskData.map(d => d.avgPremium), text: regionRiskData.map(d => d.region), mode: 'markers+text', type: 'scatter', marker: { size: regionRiskData.map(d => Math.sqrt(d.volume) * 5) } }],
      layout: { title: 'Regional Risk vs Performance Matrix', xaxis: { title: 'Conversion Rate (%)' }, yaxis: { title: 'Avg Premium ($)' }, height: 400, margin: { t: 40, r: 40, b: 60, l: 80 } }
    };

    const topRegion = Object.entries(metrics.regionMetrics).sort((a, b) => b[1].totalPremium - a[1].totalPremium)[0];
    const highRiskCountries = tableData.filter(c => c.conversionRate < 5 && c.shipments > 100).sort((a, b) => b.shipments - a.shipments);
    const totalCountriesWithShipments = new Set(filteredData.kn.map(d => d.country).filter(Boolean)).size;
    const countriesWithInsurance = new Set(filteredData.nacora.filter(d => d.isBooked).map(d => d.knCountry).filter(Boolean)).size;

    const kpis = {
        countriesCovered: countriesWithInsurance,
        topRegion: topRegion ? `${topRegion[0]} ($${(topRegion[1].totalPremium/1e6).toFixed(1)}M)` : 'N/A',
        highRiskCountries: highRiskCountries.length > 0 ? `${highRiskCountries[0].country} (${highRiskCountries[0].conversionRate.toFixed(1)}%)` : 'None',
        marketPenetration: totalCountriesWithShipments > 0 ? (countriesWithInsurance / totalCountriesWithShipments) * 100 : 0
    };

    return { charts: { countryVolumeChart, riskMatrixChart }, tableData: tableData.slice(0, 50), kpis };
  }, [metrics, filteredData]);

  if (!metrics || !charts || !kpis) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg text-gray-600">Not enough data for geographic intelligence.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Countries Covered" value={kpis.countriesCovered.toString()} subtitle="With active policies" icon={Globe} />
        <KPICard title="Top Region by Premium" value={kpis.topRegion} subtitle="Highest premium volume" icon={MapPin} />
        <KPICard title="Top High-Risk Country" value={kpis.highRiskCountries} subtitle="Low conversion, high volume" icon={ShieldAlert} />
        <KPICard title="Market Penetration" value={`${kpis.marketPenetration.toFixed(1)}%`} subtitle="Countries with policies" icon={PieChart} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6"><Chart data={charts.countryVolumeChart.data} layout={charts.countryVolumeChart.layout} /></div>
        <div className="bg-white rounded-lg shadow-md p-6"><Chart data={charts.riskMatrixChart.data} layout={charts.riskMatrixChart.layout} /></div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Country Performance Details</h3>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50"><tr><th className="text-left py-2 px-2">Country</th><th className="text-right py-2 px-2">Total Shipments</th><th className="text-right py-2 px-2">Insured Shipments</th><th className="text-right py-2 px-2">Conv. Rate</th><th className="text-right py-2 px-2">Total Premium</th><th className="text-right py-2 px-2">Avg Premium</th></tr></thead>
            <tbody>
              {tableData.map((d, i) => (
                <tr key={d.country} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="py-2 px-2">{d.country}</td>
                  <td className="text-right py-2 px-2">{d.shipments.toLocaleString()}</td>
                  <td className="text-right py-2 px-2">{d.insured.toLocaleString()}</td>
                  <td className="text-right py-2 px-2">{d.conversionRate.toFixed(1)}%</td>
                  <td className="text-right py-2 px-2">${d.premium.toLocaleString()}</td>
                  <td className="text-right py-2 px-2">${Math.round(d.avgPremium).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
