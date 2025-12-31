import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock } from 'lucide-react';
import { FoodResource } from '@shared/schema';

interface ResourceCardProps {
  resource: FoodResource;
  onClick?: () => void;
  searchedZip?: string | null;
}

type ResourceType = 'Food Pantry' | 'Community Fridge' | 'Soup Kitchen' | 'Hot Meal' | 'Youth Supper (CACFP)' | 'Senior Meals' | 'Grocery Distribution';

const resourceColors: Record<ResourceType, { bg: string; border: string }> = {
  'Food Pantry': {
    bg: '#C47A4D',
    border: '#8B5837',
  },
  'Community Fridge': {
    bg: '#6BAF7D',
    border: '#4A8A5C',
  },
  'Soup Kitchen': {
    bg: '#D07A82',
    border: '#A65661',
  },
  'Hot Meal': {
    bg: '#D8A44C',
    border: '#A87F36',
  },
  'Youth Supper (CACFP)': {
    bg: '#9E8BC2',
    border: '#7366A0',
  },
  'Senior Meals': {
    bg: '#6F8FAF',
    border: '#506B8A',
  },
  'Grocery Distribution': {
    bg: '#8E9F56',
    border: '#6A763F',
  },
};

export default function ResourceCard({ resource, onClick, searchedZip }: ResourceCardProps) {
  const colors = resourceColors[resource.type as ResourceType] || resourceColors['Food Pantry'];

  return (
    <Card
      className="p-4 hover-elevate cursor-pointer active-elevate-2 bg-[#ffffff]"
      onClick={onClick}
      data-testid={`card-resource-${resource.id}`}
    >
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1 truncate" data-testid={`text-name-${resource.id}`}>
              {resource.name}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs uppercase font-medium"
                style={{
                  backgroundColor: colors.bg,
                  color: '#000000',
                  borderColor: colors.border,
                  borderWidth: '2px',
                }}
              >
                {resource.type}
              </Badge>
              {resource.distance && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span data-testid={`text-distance-${resource.id}`}>
                      {typeof resource.distance === 'number'
                        ? `${resource.distance.toFixed(1)} mi`
                        : resource.distance}
                    </span>
                  </div>
                  {typeof resource.distance === 'number' && searchedZip && (
                    <div className="text-xs text-muted-foreground">
                      {`approx ${resource.distance < 0.1 ? '<0.1' : resource.distance.toFixed(1)} miles from ${searchedZip}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {resource.hours && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span data-testid={`text-hours-${resource.id}`}>{resource.hours}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
