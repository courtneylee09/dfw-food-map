import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MapPin, List, Crosshair, Plus } from 'lucide-react';
import { useLocation } from 'wouter';
import ResourceMap from '@/components/ResourceMap';
import FilterPills, { FilterType } from '@/components/FilterPills';
import ResourceList from '@/components/ResourceList';
import ResourceDetail from '@/components/ResourceDetail';
import AddToHomeModal from '@/components/AddToHomeModal';
import { FoodResource } from '@shared/schema';
import logoImage from '@assets/logo.png';

type View = 'map' | 'list' | 'detail';

export default function Home() {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<View>('map');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [selectedResource, setSelectedResource] = useState<FoodResource | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number]>([32.7767, -96.7970]);
  const [showAddToHome, setShowAddToHome] = useState(false);
  const [hasClickedResource, setHasClickedResource] = useState(false);

  const { data: resources = [], isLoading } = useQuery<FoodResource[]>({
    queryKey: ['/api/resources', userLocation[0], userLocation[1]],
    queryFn: async () => {
      const response = await fetch(`/api/resources?lat=${userLocation[0]}&lng=${userLocation[1]}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch resources');
      return response.json();
    },
    staleTime: 0,
    gcTime: 0
  });

  const filteredResources = resources.filter(resource => {
    if (activeFilter === 'All') return true;
    return resource.type === activeFilter;
  });

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        console.log('Location updated:', position.coords);
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to get your location. ';

        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please enable location permissions in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
        }

        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  useEffect(() => {
    if (hasClickedResource) {
      const timer = setTimeout(() => {
        setShowAddToHome(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [hasClickedResource]);

  if (view === 'detail' && selectedResource) {
    return (
      <ResourceDetail
        resource={selectedResource}
        onBack={() => setView('map')}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="h-screen-safe flex items-center justify-center">
        <p className="text-lg text-muted-foreground">Loading resources...</p>
      </div>
    );
  }

  return (
    <div className="h-screen-safe flex flex-col bg-background overflow-hidden">
      <div className="flex-none p-3 border-b space-y-2">
        <div className="grid grid-cols-3 items-center mb-1">
          <div></div>
          <img
            src={logoImage}
            alt="Dallas-Fort Worth Food Resources"
            className="w-40 h-auto justify-self-center"
            data-testid="img-logo"
          />
          <Button
            size="icon"
            variant="ghost"
            className="justify-self-end bg-[#114121] text-[#fff]"
            onClick={() => setLocation('/submit')}
            data-testid="button-add-resource"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
        <p className="text-base text-muted-foreground text-center">
          Find free meals and groceries near you
        </p>
        
        <Button
          onClick={handleUseLocation}
          className="w-full min-h-11 text-base font-medium"
          data-testid="button-use-location"
        >
          <Crosshair className="w-5 h-5 mr-2" />
          Use My Location
        </Button>

        <div className="flex gap-2">
          <Button
            variant={view === 'map' ? 'default' : 'outline'}
            className="flex-1 min-h-11 text-base font-medium"
            onClick={() => setView('map')}
            data-testid="button-view-map"
          >
            <MapPin className="w-5 h-5 mr-2" />
            Map
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            className="flex-1 min-h-11 text-base font-medium"
            onClick={() => setView('list')}
            data-testid="button-view-list"
          >
            <List className="w-5 h-5 mr-2" />
            List
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative overflow-hidden">
        {view === 'map' ? (
          <ResourceMap
            resources={filteredResources}
            center={userLocation}
            zoom={13}
            onResourceClick={(resource) => {
              setSelectedResource(resource);
              setView('detail');
              if (!hasClickedResource) {
                setHasClickedResource(true);
              }
            }}
          />
        ) : (
          <div className="h-full overflow-auto">
            <ResourceList
              resources={filteredResources}
              onResourceClick={(resource) => {
                setSelectedResource(resource);
                setView('detail');
                if (!hasClickedResource) {
                  setHasClickedResource(true);
                }
              }}
            />
          </div>
        )}
      </div>
      <div className="flex-none border-t p-2">
        <FilterPills
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>
      <AddToHomeModal
        isOpen={showAddToHome}
        onClose={() => setShowAddToHome(false)}
      />
    </div>
  );
}
