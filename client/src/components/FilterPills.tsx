import { Badge } from '@/components/ui/badge';
import { useState } from 'react';

export type FilterType = 'All' | 'Open Now' | 'Community Fridge' | 'Hot Meal' | 'Food Pantry';

interface FilterPillsProps {
  onFilterChange: (filter: FilterType) => void;
  activeFilter: FilterType;
}

const filters: FilterType[] = ['All', 'Open Now', 'Community Fridge', 'Hot Meal', 'Food Pantry'];

export default function FilterPills({ onFilterChange, activeFilter }: FilterPillsProps) {
  return (
    <div 
      className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
      data-testid="filter-pills-container"
    >
      {filters.map((filter) => (
        <Badge
          key={filter}
          variant={activeFilter === filter ? "default" : "outline"}
          className="cursor-pointer whitespace-nowrap px-4 py-2 text-base font-medium min-h-10 snap-start"
          onClick={() => onFilterChange(filter)}
          data-testid={`filter-${filter.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {filter}
        </Badge>
      ))}
    </div>
  );
}
