"use client";

import React, { useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp, Target, Award, TrendingUpIcon, Lightbulb } from 'lucide-react';
import type { ConversionMetrics, NacoraDataRow, KNDataRow, IntelligenceMetrics, SynergyData } from '@/lib/types';
import Chart from './chart';

interface Intelligence360Props {
metrics: ConversionMetrics | null;
filteredData: { nacora: NacoraDataRow[], kn: KNDataRow[] };
}

export function Intelligence360({ metrics, filteredData }: Intelligence360Props) {
const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});

const intelligenceMetrics = useMemo((): IntelligenceMetrics | null => {
  if (!metrics || !filteredData.nacora.length) return null;

  // Customer Segmentation
  const customerShipments: Record<string, any> = {};
  filteredData.nacora.forEach(d => {
    const customer = d.namedAssured || 'Unknown';
    const key = `${customer}-${d.businessUnit}`;
    if (!customerShipments[key]) customerShipments[key] = { customer, country: d.namedAssuredCountry, businessUnit: d.businessUnit, totalShipments: 0, insuredShipments: 0 };
    customerShipments[key].totalShipments++;
    if (d.isBooked) customerShipments[key].insuredShipments++;
  });
  const customers = Object.values(customerShipments).map(c => ({ ...c, annualShipments: c.totalShipments, conversionRate: c.totalShipments > 0 ? (c.insuredShipments / c.totalShipments) * 100 : 0 }));
  const clusters: IntelligenceMetrics['clusters'] = {
    A: { min: 1000, max: Infinity, label: 'Enterprise (1k+/yr)', customers: [], totalShipments: 0, insuredShipments: 0, conversionRate: 0, customerCount: 0 },
    B: { min: 100, max: 999, label: 'Large (100-999/yr)', customers: [], totalShipments: 0, insuredShipments: 0, conversionRate: 0, customerCount: 0 },
    C: { min: 20, max: 99, label: 'Medium (20-99/yr)', customers: [], totalShipments: 0, insuredShipments: 0, conversionRate: 0, customerCount: 0 },
    D: { min: 1, max: 19, label: 'Small (1-19/yr)', customers: [], totalShipments: 0, insuredShipments: 0, conversionRate: 0, customerCount: 0 }
  };
  customers.forEach(c => {
    if (c.annualShipments >= clusters.A.min) clusters.A.customers.push(c);
    else if (c.annualShipments >= clusters.B.min) clusters.B.customers.push(c);
    else if (c.annualShipments >= clusters.C.min) clusters.C.customers.push(c);
    else if (c.annualShipments >= clusters.D.min) clusters.D.customers.push(c);
  });
  Object.values(clusters).forEach(cl => {
    cl.totalShipments = cl.customers.reduce((s, c) => s + c.totalShipments, 0);
    cl.insuredShipments = cl.customers.reduce((s, c) => s + c.insuredShipments, 0);
    cl.conversionRate = cl.totalShipments > 0 ? (cl.insuredShipments / cl.totalShipments) * 100 : 0;
    cl.customerCount = cl.customers.length;
  });

  // Top Customers by Premium
  const customerPremiums: Record<string, any> = {};
  filteredData.nacora.filter(d => d.isBooked).forEach(s => {
    const customer = s.namedAssured || 'Unknown';
    if (!customerPremiums[customer]) customerPremiums[customer] = { customer, country: s.namedAssuredCountry, businessUnit: s.businessUnit, totalPremium: 0, shipmentCount: 0 };
    customerPremiums[customer].totalPremium += s.totalPremiumUSD;
    customerPremiums[customer].shipmentCount++;
  });
  const topCustomers = Object.values(customerPremiums).map(c => ({ ...c, avgPremium: c.shipmentCount > 0 ? c.totalPremium / c.shipmentCount : 0 })).sort((a, b) => b.totalPremium - a.totalPremium);

  // Synergy Matrix / Rebate Potential (aligned with TSX attachment)
  const countryData: Record<string, { totalShipments: number; insuredShipments: number }> = {};
  metrics.conversionData.forEach(d => {
    if (!d.country) return;
    if (!countryData[d.country]) countryData[d.country] = { totalShipments: 0, insuredShipments: 0 };
    countryData[d.country].totalShipments += d.shipmentCount;
    countryData[d.country].insuredShipments += d.insuredCount;
  });

  // Fixed assumptions from TSX:
  const ASSUMED_PREMIUM_PER_SHIPMENT = 150;
  const REBATE_RATE = 0.15;

  const synergyMatrix: SynergyData[] = Object.entries(countryData)
    .map(([country, data]) => {
      const conversionRate = data.totalShipments > 0 ? (data.insuredShipments / data.totalShipments) * 100 : 0;
      const uninsuredShipments = Math.max(0, data.totalShipments - data.insuredShipments);

      // For UI "Uninsured" column, keep conversionGap as COUNT of uninsured shipments
      const conversionGap = uninsuredShipments;

      // Match TSX scoring approach: more shipments and lower rate = higher score
      const conversionGapRate = 100 - conversionRate;
      const synergyScore = (data.totalShipments / 1000) * (conversionGapRate / 100);

      // Critical correction per TSX: use fixed $150 per shipment and 15% rebate
      const potentialRebate = uninsuredShipments * ASSUMED_PREMIUM_PER_SHIPMENT * REBATE_RATE;

      return {
        country,
        totalShipments: data.totalShipments,
        insuredShipments: data.insuredShipments,
        conversionRate,
        conversionGap,
        synergyScore,
        potentialRebate,
      };
    })
    .sort((a, b) => b.potentialRebate - a.potentialRebate);

  return {
    clusters,
    topCustomers,
    marketShareByCountry: [],
    synergyMatrix,
    globalMetrics: { totalMarketSize: 22100000000, nacoraMarketShare: (metrics.totalPremium / 22100000000) * 100 }
  };
}, [metrics, filteredData]);

if (!intelligenceMetrics || !metrics) {
  return (
    <div className="text-center py-20">
      <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <p className="text-lg text-gray-600">Not enough data for 360° intelligence.</p>
    </div>
  );
}

const clusterData = Object.values(intelligenceMetrics.clusters);
const clusterChart = {
  data: [
    { x: clusterData.map(d => d.label), y: clusterData.map(d => d.conversionRate), type: 'bar', name: 'Conv. Rate' },
    { x: clusterData.map(d => d.label), y: clusterData.map(d => d.customerCount), type: 'scatter', mode: 'lines+markers', name: 'Customers', yaxis: 'y2' }
  ],
  layout: { title: 'Customer Segmentation Analysis', yaxis: { title: 'Rate (%)' }, yaxis2: { title: 'Customers', overlaying: 'y', side: 'right' }, height: 400, margin: { t: 40, r: 80, b: 120, l: 60 } }
};

const topPremiumGeneratorsChart = {
    data: [{
        x: intelligenceMetrics.topCustomers.slice(0, 10).map(c => c.totalPremium),
        y: intelligenceMetrics.topCustomers.slice(0, 10).map(c => c.customer),
        type: 'bar',
        orientation: 'h',
        marker: { color: '#288cfa' }
    }],
    layout: { title: 'Top 10 Premium Generators', xaxis: { title: 'Total Premium (USD)' }, height: 400, margin: { t: 40, r: 40, b: 60, l: 250 } }
};

return (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg p-6 text-white">
      <h2 className="text-2xl font-bold mb-4">360° Intelligence Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4"><p className="text-sm opacity-80">Global Market Share</p><p className="text-3xl font-bold">{intelligenceMetrics.globalMetrics.nacoraMarketShare.toFixed(3)}%</p></div>
          <div className="bg-white/10 rounded-lg p-4"><p className="text-sm opacity-80">Enterprise Customers</p><p className="text-3xl font-bold">{intelligenceMetrics.clusters.A.customerCount}</p></div>
          <div className="bg-white/10 rounded-lg p-4"><p className="text-sm opacity-80">Top Customer Premium</p><p className="text-3xl font-bold">${(intelligenceMetrics.topCustomers[0]?.totalPremium / 1000).toFixed(0)}k</p></div>
          <div className="bg-white/10 rounded-lg p-4"><p className="text-sm opacity-80">Top Rebate Potential</p><p className="text-3xl font-bold">${(intelligenceMetrics.synergyMatrix[0]?.potentialRebate / 1000).toFixed(0)}k</p></div>
      </div>
    </div>
    
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Customer Segmentation</h3>
      <Chart data={clusterChart.data} layout={clusterChart.layout} />
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(intelligenceMetrics.clusters).map(([key, cluster]) => (
          <div key={key} className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-sm">{cluster.label}</h4>
            <p className="text-2xl font-bold mt-2">{cluster.customerCount} customers</p>
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium mb-1">Top Customers:</p>
              {cluster.customers.slice(0, expandedClusters[key] ? cluster.customers.length : 3).map((c, i) => <p key={i} className="text-xs truncate" title={c.customer}>{c.customer}</p>)}
              {cluster.customers.length > 3 && <button onClick={() => setExpandedClusters(p => ({...p, [key]: !p[key]}))} className="text-xs text-blue-600 flex items-center mt-1">{expandedClusters[key] ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}{expandedClusters[key] ? 'Show less' : `+${cluster.customers.length - 3} more`}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Top Premium Generators</h3>
          <Chart data={topPremiumGeneratorsChart.data} layout={topPremiumGeneratorsChart.layout} />
      </div>
      <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Top Rebate Potential (Top 10)</h3>
          <div className="overflow-x-auto">
              <table className="w-full text-sm">
                  <thead><tr><th className="text-left py-2">Country</th><th className="text-right py-2">Uninsured</th><th className="text-right py-2">Potential Rebate</th></tr></thead>
                  <tbody>
                      {intelligenceMetrics.synergyMatrix.slice(0, 10).map((d, i) => (
                          <tr key={i} className="border-t"><td className="py-2">{d.country}</td><td className="text-right py-2">{d.conversionGap.toLocaleString()}</td><td className="text-right py-2 font-medium text-green-600">${d.potentialRebate.toLocaleString(undefined, {maximumFractionDigits: 0})}</td></tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </div>

    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Customer Details (Top 20 by Premium)</h3>
      <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50"><tr><th className="text-left py-2 px-2">Customer</th><th className="text-left py-2 px-2">Country</th><th className="text-right py-2 px-2">Total Premium</th><th className="text-right py-2 px-2">Insured Shipments</th><th className="text-right py-2 px-2">Avg Premium/Shipment</th></tr></thead>
              <tbody>
                  {intelligenceMetrics.topCustomers.slice(0, 20).map((c, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                          <td className="py-2 px-2 truncate" title={c.customer}>{c.customer}</td>
                          <td className="py-2 px-2">{c.country}</td>
                          <td className="text-right py-2 px-2">${c.totalPremium.toLocaleString()}</td>
                          <td className="text-right py-2 px-2">{c.shipmentCount.toLocaleString()}</td>
                          <td className="text-right py-2 px-2">${c.avgPremium.toFixed(2)}</td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </div>
    </div>

    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center"><Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />Strategic Intelligence Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-bold text-blue-800 flex items-center"><Target className="w-4 h-4 mr-2"/>Conversion Focus</h4>
              <p className="text-sm mt-2">Target <strong>Medium</strong> and <strong>Large</strong> customer segments. They have significant shipment volumes but lower conversion rates than Enterprise clients, presenting the largest growth opportunity.</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-bold text-green-800 flex items-center"><Award className="w-4 h-4 mr-2"/>VIP Customer Program</h4>
              <p className="text-sm mt-2">Engage the <strong>Top 10 Premium Generators</strong> with a loyalty program. Their high average premium per shipment indicates high-value cargo, making retention critical.</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="font-bold text-orange-800 flex items-center"><TrendingUpIcon className="w-4 h-4 mr-2"/>Market Entry Strategy</h4>
              <p className="text-sm mt-2">Prioritize countries with high <strong>Rebate Potential</strong> like <strong>{intelligenceMetrics.synergyMatrix[0]?.country}</strong> and <strong>{intelligenceMetrics.synergyMatrix[1]?.country}</strong>. A targeted campaign focusing on the financial benefits of insurance could yield significant returns.</p>
          </div>
      </div>
    </div>
  </div>
);
}
