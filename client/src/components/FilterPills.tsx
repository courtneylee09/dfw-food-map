import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';

export type FilterType = 'All' | 'Food Pantry' | 'Community Fridge' | 'Soup Kitchen' | 'Hot Meal' | 'Youth Supper (CACFP)' | 'Senior Meals' | 'Grocery Distribution';

interface FilterPillsProps {
  onFilterChange: (filter: FilterType) => void;
  activeFilter: FilterType;
}

const filters: FilterType[] = ['All', 'Food Pantry', 'Community Fridge', 'Soup Kitchen', 'Hot Meal', 'Youth Supper (CACFP)', 'Senior Meals', 'Grocery Distribution'];

const filterColors: Record<FilterType, { bg: string; text: string; border: string }> = {
  'All': {
    bg: '#f4f4f5',
    text: '#18181b',
    border: '#e4e4e7',
  },
  'Food Pantry': {
    bg: '#C47A4D',
    text: '#ffffff',
    border: '#8B5837',
  },
  'Community Fridge': {
    bg: '#6BAF7D',
    text: '#ffffff',
    border: '#4A8A5C',
  },
  'Soup Kitchen': {
    bg: '#D07A82',
    text: '#ffffff',
    border: '#A65661',
  },
  'Hot Meal': {
    bg: '#D8A44C',
    text: '#ffffff',
    border: '#A87F36',
  },
  'Youth Supper (CACFP)': {
    bg: '#9E8BC2',
    text: '#ffffff',
    border: '#7366A0',
  },
  'Senior Meals': {
    bg: '#6F8FAF',
    text: '#ffffff',
    border: '#506B8A',
  },
  'Grocery Distribution': {
    bg: '#8E9F56',
    text: '#ffffff',
    border: '#6A763F',
  },
};

export default function FilterPills({ onFilterChange, activeFilter }: FilterPillsProps) {
  return (
    <div className="relative">
      <div
        className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory px-1"
        data-testid="filter-pills-container"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {filters.map((filter) => {
          const colors = filterColors[filter];
          const isActive = activeFilter === filter;

          return (
            <Badge
              key={filter}
              variant="outline"
              className="cursor-pointer whitespace-nowrap px-4 py-2.5 text-sm font-semibold min-h-10 snap-start flex items-center transition-all shadow-sm hover:shadow-md active:scale-95"
              onClick={() => onFilterChange(filter)}
              data-testid={`filter-${filter.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`}
              style={{
                backgroundColor: isActive ? colors.bg : '#ffffff',
                color: isActive ? colors.text : colors.bg,
                borderColor: colors.bg,
                borderWidth: '2px',
                opacity: 1,
                boxShadow: isActive ? `0 4px 12px ${colors.bg}40` : '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              {filter}
            </Badge>
          );
        })}
      </div>
      <div className="absolute right-0 top-0 bottom-3 w-12 bg-gradient-to-l from-background via-background/80 to-transparent pointer-events-none flex items-center justify-end pr-2">
        <ChevronRight className="w-5 h-5 text-muted-foreground/60 animate-pulse" data-testid="icon-scroll-indicator" />
      </div>
    </div>
  );
}
