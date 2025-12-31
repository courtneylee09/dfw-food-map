import { FoodResource } from '@shared/schema';
import ResourceCard from './ResourceCard';

interface ResourceListProps {
  resources: FoodResource[];
  onResourceClick: (resource: FoodResource) => void;
  searchedZip?: string | null;
}

export default function ResourceList({ resources, onResourceClick, searchedZip }: ResourceListProps) {
  if (resources.length === 0) {
    return (
      <div className="text-center py-12 px-4" data-testid="text-no-resources">
        <p className="text-lg text-muted-foreground">
          No resources found. Try adjusting your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4" data-testid="list-resources">
      {resources.map((resource) => (
        <ResourceCard
          key={resource.id}
          resource={resource}
          onClick={() => onResourceClick(resource)}
          searchedZip={searchedZip}
        />
      ))}
    </div>
  );
}
