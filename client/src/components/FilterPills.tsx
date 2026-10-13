import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import { categoryColors } from '@/lib/categoryColors';
import { CATEGORIES, type Category } from '@shared/categories';

export type FilterType = 'All' | Category;

interface FilterPillsProps {
  onFilterChange: (filter: FilterType) => void;
  activeFilter: FilterType;
}

const filters: FilterType[] = ['All', ...CATEGORIES];

// Active: category fill. Inactive: white with the darker shade for readable text.
const ALL_COLORS = { fill: '#18181b', dark: '#18181b', onFill: '#ffffff' };
const filterColors = (filter: FilterType) => (filter === 'All' ? ALL_COLORS : categoryColors[filter]);

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
          const colors = filterColors(filter);
          const isActive = activeFilter === filter;

          return (
            <Badge
              key={filter}
              variant="outline"
              className="cursor-pointer whitespace-nowrap px-4 py-2.5 text-sm font-semibold min-h-10 snap-start flex items-center transition-all shadow-sm hover:shadow-md active:scale-95"
              onClick={() => onFilterChange(filter)}
              data-testid={`filter-${filter.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`}
              style={{
                backgroundColor: isActive ? colors.fill : '#ffffff',
                color: isActive ? colors.onFill : colors.dark,
                borderColor: colors.fill,
                borderWidth: '2px',
                opacity: 1,
                boxShadow: isActive ? `0 4px 12px ${colors.fill}55` : '0 1px 3px rgba(0,0,0,0.1)',
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
