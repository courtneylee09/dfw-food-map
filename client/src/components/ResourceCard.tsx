import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin } from 'lucide-react';
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
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg mb-1 truncate" data-testid={`text-name-${resource.id}`}>
            {resource.name}
          </h3>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
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
        <div className="flex-shrink-0">
          {resource.isOpen ? (
            <Badge 
              className="bg-primary text-primary-foreground font-bold whitespace-nowrap"
              data-testid={`status-open-${resource.id}`}
            >
              OPEN
            </Badge>
          ) : (
            <Badge 
              variant="outline" 
              className="border-destructive text-destructive font-bold whitespace-nowrap"
              data-testid={`status-closed-${resource.id}`}
            >
              CLOSED
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
