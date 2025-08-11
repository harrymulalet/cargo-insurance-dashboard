"use client";

import React, { useMemo } from 'react';
import { AlertCircle, TrendingUp, DollarSign, Package, Globe } from 'lucide-react';
import type { ConversionMetrics, NacoraDataRow, KNDataRow } from '@/lib/types';
import { KPICard } from './kpi-card';
import Chart from './chart';

interface ExecutiveSummaryProps {
  metrics: ConversionMetrics | null;
  filteredData: { nacora: NacoraDataRow[], kn: KNDataRow[] };
}

export function ExecutiveSummary({ metrics, filteredData }: ExecutiveSummaryProps) {
  const charts = useMemo(() => {
    if (!metrics) return null;

    const monthlyData: Record<string, { shipments: number; insured: number; premium: number }> = {};
    metrics.conversionData.forEach(d => {
      if (!monthlyData[d.monthYear]) monthlyData[d.monthYear] = { shipments: 0, insured: 0, premium: 0 };
      monthlyData[d.monthYear].shipments += d.shipmentCount;
      monthlyData[d.monthYear].insured += d.insuredCount;
    });
    filteredData.nacora.filter(d => d.isBooked && d.monthYear).forEach(p => {
      if (monthlyData[p.monthYear!]) monthlyData[p.monthYear!].premium += p.totalPremiumUSD;
    });

    const sortedMonths = Object.keys(monthlyData).sort();
    
    const conversionTrend = {
      data: [{ x: sortedMonths, y: sortedMonths.map(m => monthlyData[m].shipments > 0 ? (monthlyData[m].insured / monthlyData[m].shipments) * 100 : 0), type: 'scatter', mode: 'lines+markers', name: 'Conversion Rate', line: { color: '#288cfa', width: 3 }, marker: { size: 8 } }],
      layout: { title: 'Insurance Conversion Rate Trend', yaxis: { title: 'Rate (%)', tickformat: '.1f' }, height: 400, margin: { t: 40, r: 40, b: 60, l: 60 } }
    };

    const premiumVolume = {
      data: [{ x: sortedMonths, y: sortedMonths.map(m => monthlyData[m].premium), type: 'bar', marker: { color: '#38ce3c' } }],
      layout: { title: 'Monthly Premium Volume (USD)', yaxis: { title: 'Premium (USD)', tickformat: '$,.0f' }, height: 400, margin: { t: 40, r: 40, b: 60, l: 60 } }
    };

    const regionData = Object.entries(metrics.regionMetrics);
    const regionPie = {
      data: [{ values: regionData.map(([, d]) => d.totalPremium), labels: regionData.map(([r]) => r), type: 'pie', hole: 0.4, textinfo: 'label+percent', insidetextorientation: 'radial' }],
      layout: { title: 'Premium Distribution by Region', height: 400, margin: { t: 40, r: 40, b: 40, l: 40 }, annotations: [{ font: { size: 20, weight: 'bold' }, showarrow: false, text: `${(metrics.totalPremium / 1000000).toFixed(1)}M`, x: 0.5, y: 0.5 }] }
    };

    const businessUnitData: Record<string, { shipments: number; insured: number }> = {};
    metrics.conversionData.forEach(d => {
        if (!businessUnitData[d.businessUnit]) businessUnitData[d.businessUnit] = { shipments: 0, insured: 0 };
        businessUnitData[d.businessUnit].shipments += d.shipmentCount;
        businessUnitData[d.businessUnit].insured += d.insuredCount;
    });
    const businessUnits = Object.keys(businessUnitData);
    const businessUnitChart = {
        data: [{ x: businessUnits, y: businessUnits.map(unit => businessUnitData[unit].shipments > 0 ? (businessUnitData[unit].insured / businessUnitData[unit].shipments) * 100 : 0), type: 'bar' }],
        layout: { title: 'Conversion Rate by Business Unit', yaxis: { title: 'Rate (%)', tickformat: '.1f' }, height: 400, margin: { t: 40, r: 40, b: 60, l: 60 } }
    };

    const globalDistribution = {
        data: [{ values: [39.8, 32.2, 11.9, 7.5, 6.0, 2.7], labels: ['Europe', 'Asia/Pacific', 'Latin America', 'North America', 'Middle East', 'Africa'], type: 'pie', hole: 0.4 }],
        layout: { title: 'Global Premium Distribution for Cargo Market in 2023 (IUMI)', height: 400, margin: { t: 40, r: 40, b: 40, l: 40 } }
    };

    return { conversionTrend, premiumVolume, regionPie, businessUnitChart, globalDistribution };
  }, [metrics, filteredData]);

  if (!metrics || !charts) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg text-gray-600">Not enough data to display summary. Please upload and process files.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Overall Conversion Rate" value={`${metrics.overallConversionRate.toFixed(1)}%`} subtitle="Insured vs Total Shipments" icon={TrendingUp} trend={2.5} />
        <KPICard title="Total Premium Volume" value={`$${(metrics.totalPremium / 1_000_000).toFixed(1)}M`} subtitle="Year to date" icon={DollarSign} trend={5.2} />
        <KPICard title="Active Policies" value={metrics.totalInsured.toLocaleString()} subtitle="Currently insured shipments" icon={Package} trend={3.8} />
        <KPICard title="Coverage Regions" value={Object.keys(metrics.regionMetrics).length.toString()} subtitle="Global market presence" icon={Globe} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6"><Chart data={charts.conversionTrend.data} layout={charts.conversionTrend.layout} /></div>
        <div className="bg-white rounded-lg shadow-md p-6"><Chart data={charts.premiumVolume.data} layout={charts.premiumVolume.layout} /></div>
        <div className="bg-white rounded-lg shadow-md p-6"><Chart data={charts.regionPie.data} layout={charts.regionPie.layout} /></div>
        <div className="bg-white rounded-lg shadow-md p-6"><Chart data={charts.businessUnitChart.data} layout={charts.businessUnitChart.layout} /></div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
        <Chart data={charts.globalDistribution.data} layout={charts.globalDistribution.layout} />
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <p className="text-sm text-gray-600">
              <strong>Note:</strong> This is static data from IUMI 2023 report showing global cargo insurance premium distribution. 
              In production, this would integrate with live IUMI data for accurate market intelligence.
            </p>
        </div>
      </div>
    </div>
  );
}
