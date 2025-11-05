import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, List } from 'lucide-react';
import ResourceMap from '@/components/ResourceMap';
import FilterPills, { FilterType } from '@/components/FilterPills';
import ResourceList from '@/components/ResourceList';
import ResourceDetail from '@/components/ResourceDetail';
import AddToHomeModal from '@/components/AddToHomeModal';
import { FoodResource } from '@shared/schema';

type View = 'map' | 'list' | 'detail';

export default function Home() {
  const [view, setView] = useState<View>('map');
  const [activeFilter, setActiveFilter] = useState<FilterType>('All');
  const [selectedResource, setSelectedResource] = useState<FoodResource | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number]>([42.3314, -83.0458]);
  const [showAddToHome, setShowAddToHome] = useState(false);
  const [hasClickedResource, setHasClickedResource] = useState(false);

  const resources: FoodResource[] = [
    {
      id: '1',
      name: 'Gleaners Community Food Bank',
      address: '2131 Beaufait St, Detroit, MI 48207',
      phone: '(313) 923-3535',
      hours: 'Mon-Fri 9am-5pm',
      type: 'Food Bank',
      latitude: 42.3584,
      longitude: -83.0408,
      isOpen: true,
      isFavorite: false,
    },
    {
      id: '2',
      name: 'St. Peter & Paul Soup Kitchen',
      address: '629 Madison St, Detroit, MI 48226',
      phone: '(313) 961-3022',
      hours: 'Daily 11am-1pm',
      type: 'Soup Kitchen',
      latitude: 42.3298,
      longitude: -83.0515,
      isOpen: true,
      isFavorite: false,
    },
    {
      id: '3',
      name: 'Community Meal Program',
      address: '1234 Main St, Detroit, MI 48201',
      phone: '(313) 555-0100',
      hours: 'Mon-Wed-Fri 5pm-7pm',
      type: 'Soup Kitchen',
      latitude: 42.3314,
      longitude: -83.0458,
      isOpen: false,
      isFavorite: false,
    },
  ];

  const filteredResources = resources.filter(resource => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Open Now') return resource.isOpen;
    return resource.type === activeFilter;
  });

  const handleUseLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
          console.log('Location updated:', position.coords);
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
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
        onSuggestUpdate={() => console.log('Suggest update clicked')}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <div className="flex-none p-3 border-b space-y-2">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-1">Detroit Food Resources</h1>
          <p className="text-base text-muted-foreground">
            Find free meals and groceries near you
          </p>
        </div>
        
        <Button
          onClick={handleUseLocation}
          className="w-full min-h-11 text-base font-bold"
          data-testid="button-use-location"
        >
          <MapPin className="w-5 h-5 mr-2" />
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
