"use client";

import React, { useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import type { ConversionMetrics } from '@/lib/types';
import Chart from './chart';

interface ConversionAnalysisProps {
  metrics: ConversionMetrics | null;
}

export function ConversionAnalysis({ metrics }: ConversionAnalysisProps) {
  const charts = useMemo(() => {
    if (!metrics) return null;

    const opportunities = metrics.conversionData
      .filter(d => d.shipmentCount > 50)
      .sort((a, b) => b.opportunity - a.opportunity)
      .slice(0, 20);
    const opportunityChart = {
      data: [{ x: opportunities.map(d => d.opportunity), y: opportunities.map(d => `${d.country} - ${d.businessUnit}`), type: 'bar', orientation: 'h', text: opportunities.map(d => `Conv: ${d.conversionRate.toFixed(1)}%`), textposition: 'outside' }],
      layout: { title: 'Top 20 Conversion Opportunities', xaxis: { title: 'Uninsured Shipments' }, height: 600, margin: { t: 40, r: 120, b: 60, l: 200 } }
    };

    const countryData: Record<string, { shipments: number; insured: number }> = {};
    metrics.conversionData.forEach(d => {
      if (!d.country) return;
      if (!countryData[d.country]) countryData[d.country] = { shipments: 0, insured: 0 };
      countryData[d.country].shipments += d.shipmentCount;
      countryData[d.country].insured += d.insuredCount;
    });
    const countries = Object.keys(countryData).filter(c => countryData[c].shipments > 100).sort((a, b) => countryData[b].shipments - countryData[a].shipments).slice(0, 30);
    const heatmap = {
      data: [{ x: countries, y: ['Conversion Rate %'], z: [countries.map(c => countryData[c].shipments > 0 ? (countryData[c].insured / countryData[c].shipments) * 100 : 0)], type: 'heatmap', colorscale: 'Viridis' }],
      layout: { title: 'Conversion Rates by Country (Top 30)', xaxis: { tickangle: -45 }, height: 400, margin: { t: 40, r: 40, b: 120, l: 60 } }
    };

    const monthlyComparison: Record<string, Record<string, { shipments: number; insured: number }>> = {};
    metrics.conversionData.forEach(d => {
      if (!monthlyComparison[d.businessUnit]) monthlyComparison[d.businessUnit] = {};
      if (!monthlyComparison[d.businessUnit][d.monthYear]) monthlyComparison[d.businessUnit][d.monthYear] = { shipments: 0, insured: 0 };
      monthlyComparison[d.businessUnit][d.monthYear].shipments += d.shipmentCount;
      monthlyComparison[d.businessUnit][d.monthYear].insured += d.insuredCount;
    });
    const months = [...new Set(metrics.conversionData.map(d => d.monthYear))].sort();
    const timeSeries = {
      data: Object.entries(monthlyComparison).map(([unit, data]) => ({
        x: months,
        y: months.map(month => data[month] && data[month].shipments > 0 ? (data[month].insured / data[month].shipments) * 100 : 0),
        type: 'scatter', mode: 'lines+markers', name: unit
      })),
      layout: { title: 'Conversion Rate Trends by Business Unit', yaxis: { title: 'Rate (%)' }, height: 400, margin: { t: 40, r: 40, b: 60, l: 60 } }
    };

    return { opportunityChart, heatmap, timeSeries };
  }, [metrics]);

  if (!metrics || !charts) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-lg text-gray-600">Not enough data for conversion analysis.</p>
      </div>
    );
  }

  const uninsuredOpportunity = metrics.totalShipments - metrics.totalInsured;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Conversion Analysis Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
          <div><p className="text-sm text-gray-600">Total Shipments</p><p className="text-2xl font-bold">{metrics.totalShipments.toLocaleString()}</p></div>
          <div><p className="text-sm text-gray-600">Insured Shipments</p><p className="text-2xl font-bold">{metrics.totalInsured.toLocaleString()}</p></div>
          <div><p className="text-sm text-gray-600">Uninsured Opportunity</p><p className="text-2xl font-bold text-orange-600">{uninsuredOpportunity.toLocaleString()}</p></div>
          <div><p className="text-sm text-gray-600">Potential Revenue</p><p className="text-2xl font-bold text-green-600">${(uninsuredOpportunity * 150).toLocaleString()}</p></div>
          <div><p className="text-sm text-gray-600">Potential Rebate</p><p className="text-2xl font-bold text-blue-600">${Math.round(uninsuredOpportunity * 150 * 0.15).toLocaleString()}</p></div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow-md p-6"><Chart data={charts.opportunityChart.data} layout={charts.opportunityChart.layout} /></div>
      <div className="bg-white rounded-lg shadow-md p-6"><Chart data={charts.heatmap.data} layout={charts.heatmap.layout} /></div>
      <div className="bg-white rounded-lg shadow-md p-6"><Chart data={charts.timeSeries.data} layout={charts.timeSeries.layout} /></div>
    </div>
  );
}
