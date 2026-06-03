import React, { useMemo } from 'react';
import type { Airport } from '../types/airport';
import MultipleSelector, { type Option } from '@/components/base/multi-select';
import { FieldContainer, MutedMetadata } from './base/surface';

interface Props {
  label: string;
  allAirports: Airport[];
  selectedCodes: string[];
  onAdd: (code: string) => void;
  onRemove: (code: string) => void;
  placeholder: string;
}

export const AirportInput: React.FC<Props> = ({ label, allAirports, selectedCodes, onAdd, onRemove, placeholder }) => {
  const selectedOptions = useMemo<Option[]>(
    () => selectedCodes.map(code => {
      const airport = allAirports.find(a => a.iata === code);
      return airport ? { value: airport.iata, label: airport.iata } : { value: code, label: code };
    }),
    [allAirports, selectedCodes]
  );

  const handleSearch = (query: string): Option[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allAirports
      .filter(a => !selectedCodes.includes(a.iata) && a.text.toLowerCase().includes(q))
      .slice(0, 8)
      .map(a => ({ value: a.iata, label: a.label }));
  };

  const handleChange = (newOptions: Option[]) => {
    const newCodes = newOptions.map(o => o.value);
    newCodes.filter(c => !selectedCodes.includes(c)).forEach(onAdd);
    selectedCodes.filter(c => !newCodes.includes(c)).forEach(onRemove);
  };

  return (
    <FieldContainer className="flex-1 min-w-[220px]">
      <MutedMetadata className="flex justify-between gap-2.5 mb-1.5 font-bold">
        <span>{label}</span>
      </MutedMetadata>
      <MultipleSelector
        value={selectedOptions}
        onSearchSync={handleSearch}
        placeholder={placeholder}
        hidePlaceholderWhenSelected
        hideClearAllButton
        triggerSearchOnFocus={false}
        delay={0}
        commandProps={{ shouldFilter: false }}
        emptyIndicator={<p className="text-center text-sm">No airports found.</p>}
        onChange={handleChange}
      />
    </FieldContainer>
  );
};
