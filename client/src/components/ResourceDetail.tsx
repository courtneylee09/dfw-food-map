import { FoodResource } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Clock, ArrowLeft, Phone, Calendar } from 'lucide-react';

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
          onClick={onBack}
          className="min-h-11 min-w-11 p-0"
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Resource Details</h1>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-2xl font-bold leading-tight mb-3" data-testid="text-resource-name">
              {resource.name}
            </h2>
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

              {resource.phone && (
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-bold text-base mb-1">Phone</h3>
                      <a 
                        href={`tel:${resource.phone}`}
                        className="text-base text-foreground hover:underline"
                        data-testid="link-phone"
                      >
                        {resource.phone}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-1">Appointment</h3>
                    {resource.appointmentRequired ? (
                      <p className="text-base text-muted-foreground" data-testid="text-appointment">
                        Appointment required - please call ahead
                      </p>
                    ) : (
                      <p className="text-base text-muted-foreground" data-testid="text-no-appointment">
                        No appointment required
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
