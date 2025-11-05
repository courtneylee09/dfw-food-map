import FilterPills, { FilterType } from '../FilterPills';
import { useState } from 'react';

export default function FilterPillsExample() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');

  return (
    <div className="p-4">
      <FilterPills 
        activeFilter={activeFilter}
        onFilterChange={(filter) => {
          setActiveFilter(filter);
          console.log('Filter changed to:', filter);
        }}
      />
    </div>
  );
}
