import { FoodResource } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, ArrowLeft } from 'lucide-react';

interface ResourceDetailProps {
  resource: FoodResource;
  onBack: () => void;
}

export default function ResourceDetail({ resource, onBack }: ResourceDetailProps) {
  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(resource.address)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Resource Details</h1>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="text-2xl font-bold leading-tight" data-testid="text-resource-name">
                {resource.name}
              </h2>
              {resource.isOpen ? (
                <Badge className="bg-primary text-primary-foreground font-bold text-sm whitespace-nowrap">
                  OPEN NOW
                </Badge>
              ) : (
                <Badge variant="outline" className="border-destructive text-destructive font-bold text-sm whitespace-nowrap">
                  CLOSED
                </Badge>
              )}
            </div>
            <Badge variant="secondary" className="text-sm uppercase font-medium">
              {resource.type}
            </Badge>
          </div>

          <Card className="p-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-1">Address</h3>
                    <button
                      onClick={openInMaps}
                      className="text-base text-foreground hover:underline text-left"
                      data-testid="button-address"
                    >
                      {resource.address}
                    </button>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tap to open in Google Maps
                    </p>
                  </div>
                </div>
              </div>

              {resource.hours && (
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-base mb-1">Hours</h3>
                      <p className="text-base" data-testid="text-hours">
                        {resource.hours}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
