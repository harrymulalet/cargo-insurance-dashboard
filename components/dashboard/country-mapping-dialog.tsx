"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { standardCountries } from '@/lib/country-data';

interface CountryMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  unmatchedCountries: string[];
  onApply: (mappings: Record<string, string>) => void;
}

export function CountryMappingDialog({ isOpen, onClose, unmatchedCountries, onApply }: CountryMappingDialogProps) {
  const [currentMappings, setCurrentMappings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setCurrentMappings({});
    }
  }, [isOpen]);

  const handleApply = () => {
    onApply(currentMappings);
  };

  const mappedCount = Object.values(currentMappings).filter(Boolean).length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Map Unrecognized Countries</DialogTitle>
          <DialogDescription>Select the correct country for each unrecognized entry. Your selections will be remembered.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {unmatchedCountries.map(country => (
            <div key={country} className="flex items-center gap-3 py-1">
              <span className="font-medium w-2/5 text-sm truncate" title={country}>{country}</span>
              <Select onValueChange={(value) => setCurrentMappings(prev => ({ ...prev, [country]: value }))}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select country..." /></SelectTrigger>
                <SelectContent>
                  {standardCountries.map(stdCountry => (
                    <SelectItem key={stdCountry} value={stdCountry}>{stdCountry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <DialogFooter className="border-t pt-4">
            <div className="flex justify-between items-center w-full">
                <span className="text-xs text-gray-600">{mappedCount} of {unmatchedCountries.length} mapped</span>
                <div>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleApply} disabled={mappedCount === 0} className="ml-2">Apply Mappings</Button>
                </div>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
