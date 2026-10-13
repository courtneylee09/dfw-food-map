import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock, Info } from 'lucide-react';
import { FoodResource } from '@shared/schema';
import { getDisplayHours } from '@shared/hours';
import { formatDistanceMiles } from '@shared/distance';
import { getCategoryColor } from '@/lib/categoryColors';
import VerificationBadge from '@/components/VerificationBadge';

interface ResourceCardProps {
  resource: FoodResource;
  onClick?: () => void;
  searchedZip?: string | null;
}

export default function ResourceCard({ resource, onClick, searchedZip }: ResourceCardProps) {
  const category = getCategoryColor(resource.type);
  const colors = { bg: category.fill, border: category.dark, text: category.onFill };
  const displayHours = getDisplayHours(resource);

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
                  color: colors.text,
                  borderColor: colors.border,
                  borderWidth: '2px',
                }}
              >
                {resource.type}
              </Badge>
              {(resource.distance !== null && resource.distance !== undefined) && (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span data-testid={`text-distance-${resource.id}`}>
                      {typeof resource.distance === 'number'
                        ? formatDistanceMiles(resource.distance)
                        : resource.distance}
                    </span>
                  </div>
                  {typeof resource.distance === 'number' && searchedZip && (
                    <div className="text-xs text-muted-foreground">
                      {`approx ${formatDistanceMiles(resource.distance).replace(' mi', '')} miles from ${searchedZip}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span data-testid={`text-hours-${resource.id}`}>{displayHours}</span>
        </div>
        <VerificationBadge lastVerifiedDate={resource.lastVerifiedDate} />
        {resource.notes && (
          <div className="flex items-start gap-2 text-sm text-amber-900">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span data-testid={`text-notes-${resource.id}`}>{resource.notes}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
