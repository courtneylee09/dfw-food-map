import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock } from 'lucide-react';
import { FoodResource } from '@shared/schema';

interface ResourceCardProps {
  resource: FoodResource;
  onClick?: () => void;
}

export default function ResourceCard({ resource, onClick }: ResourceCardProps) {
  return (
    <Card 
      className="p-4 hover-elevate cursor-pointer active-elevate-2"
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
              <Badge variant="secondary" className="text-xs uppercase font-medium">
                {resource.type}
              </Badge>
              {resource.distance && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span data-testid={`text-distance-${resource.id}`}>{resource.distance}</span>
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
