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

  // Mock resources - todo: remove mock functionality
  const mockResources: FoodResource[] = [
    {
      id: '1',
      name: 'Cass Community Social Services',
      type: 'Food Pantry',
      address: '11850 Woodrow Wilson St, Detroit, MI 48206',
      latitude: '42.3690',
      longitude: '-83.0877',
      hours: 'Mon-Fri 10AM-2PM',
      isOpen: true,
      distance: '0.4 mi'
    },
    {
      id: '2',
      name: 'Southwest Community Fridge',
      type: 'Community Fridge',
      address: '7310 W Vernor Hwy, Detroit, MI 48209',
      latitude: '42.3185',
      longitude: '-83.1201',
      hours: '24/7',
      isOpen: true,
      distance: '1.2 mi'
    },
    {
      id: '3',
      name: 'Capuchin Soup Kitchen',
      type: 'Hot Meal',
      address: '4390 Conner St, Detroit, MI 48215',
      latitude: '42.3827',
      longitude: '-82.9898',
      hours: 'Mon-Sat 11:30AM-1PM',
      isOpen: false,
      distance: '2.1 mi'
    },
    {
      id: '4',
      name: 'Gleaners Community Food Bank',
      type: 'Food Pantry',
      address: '2131 Beaufait St, Detroit, MI 48207',
      latitude: '42.3505',
      longitude: '-83.0245',
      hours: 'Tue-Thu 9AM-4PM',
      isOpen: true,
      distance: '1.8 mi'
    },
    {
      id: '5',
      name: 'Midtown Community Fridge',
      type: 'Community Fridge',
      address: '4160 Cass Ave, Detroit, MI 48201',
      latitude: '42.3504',
      longitude: '-83.0642',
      hours: '24/7',
      isOpen: true,
      distance: '0.7 mi'
    },
  ];

  const filteredResources = mockResources.filter(resource => {
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
    const timer = setTimeout(() => {
      setShowAddToHome(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

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
    <div className="h-screen flex flex-col bg-background">
      <div className="p-4 pb-3 border-b space-y-3">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-1">Detroit Food Resources</h1>
          <p className="text-base text-muted-foreground">
            Find free meals and groceries near you
          </p>
        </div>
        
        <Button
          onClick={handleUseLocation}
          className="w-full min-h-12 text-base font-bold"
          data-testid="button-use-location"
        >
          <MapPin className="w-5 h-5 mr-2" />
          Use My Location
        </Button>

        <FilterPills
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>

      <div className="flex-1 relative overflow-hidden">
        {view === 'map' ? (
          <ResourceMap
            resources={filteredResources}
            center={userLocation}
            zoom={13}
            onResourceClick={(resource) => {
              setSelectedResource(resource);
              setView('detail');
            }}
          />
        ) : (
          <div className="h-full overflow-auto">
            <ResourceList
              resources={filteredResources}
              onResourceClick={(resource) => {
                setSelectedResource(resource);
                setView('detail');
              }}
            />
          </div>
        )}
      </div>

      <div className="border-t p-3 flex gap-2">
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

      <AddToHomeModal
        isOpen={showAddToHome}
        onClose={() => setShowAddToHome(false)}
      />
    </div>
  );
}
