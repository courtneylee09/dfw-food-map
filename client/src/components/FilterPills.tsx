import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

export type FilterType = 'All' | 'Community Fridge' | 'Hot Meal' | 'Food Pantry';

interface FilterPillsProps {
  onFilterChange: (filter: FilterType) => void;
  activeFilter: FilterType;
}

const filters: FilterType[] = ['All', 'Community Fridge', 'Hot Meal', 'Food Pantry'];

export default function FilterPills({ onFilterChange, activeFilter }: FilterPillsProps) {
  return (
    <div className="relative">
      <div 
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        data-testid="filter-pills-container"
      >
        {filters.map((filter) => (
          <Badge
            key={filter}
            variant={activeFilter === filter ? "default" : "outline"}
            className="cursor-pointer whitespace-nowrap px-4 py-2 text-base font-medium min-h-11 snap-start flex items-center"
            onClick={() => onFilterChange(filter)}
            data-testid={`filter-${filter.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {filter}
          </Badge>
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none flex items-center justify-end">
        <ChevronRight className="w-4 h-4 text-muted-foreground" data-testid="icon-scroll-indicator" />
      </div>
    </div>
  );
}
