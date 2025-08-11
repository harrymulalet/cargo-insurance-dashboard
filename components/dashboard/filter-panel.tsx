"use client";

import React from 'react';
import { Filter } from 'lucide-react';
import type { Filters, FilterOptions } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FilterPanelProps {
filters: Filters;
setFilters: React.Dispatch<React.SetStateAction<Filters>>;
options: FilterOptions;
}

export function FilterPanel({ filters, setFilters, options }: FilterPanelProps) {
const handleReset = () => {
  setFilters({
    region: 'all',
    businessUnit: 'all',
    country: 'all',
    dateRange: 'all',
    startDate: null,
    endDate: null,
  });
};

return (
  <div className="bg-white rounded-lg shadow-md p-6 mb-6">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold flex items-center"><Filter className="w-5 h-5 mr-2" />Filters</h3>
      <Button variant="link" onClick={handleReset}>Reset All</Button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <Label>Date Range</Label>
        <Select value={filters.dateRange} onValueChange={(value) => setFilters(f => ({ ...f, dateRange: value }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="last3months">Last 3 Months</SelectItem>
            <SelectItem value="last6months">Last 6 Months</SelectItem>
            <SelectItem value="last12months">Last 12 Months</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Region</Label>
        <Select value={filters.region} onValueChange={(value) => setFilters(f => ({ ...f, region: value }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Regions</SelectItem>
            {options.regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Business Unit</Label>
        <Select value={filters.businessUnit} onValueChange={(value) => setFilters(f => ({ ...f, businessUnit: value }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Business Units</SelectItem>
            {options.businessUnits.map(bu => <SelectItem key={bu} value={bu}>{bu}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Country</Label>
        <Select value={filters.country} onValueChange={(value) => setFilters(f => ({ ...f, country: value }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            {options.countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
    {filters.dateRange === 'custom' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <Label>Start Date</Label>
          <Input type="date" value={filters.startDate || ''} onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))} />
        </div>
        <div>
          <Label>End Date</Label>
          <Input type="date" value={filters.endDate || ''} onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))} />
        </div>
      </div>
    )}
  </div>
);
}
