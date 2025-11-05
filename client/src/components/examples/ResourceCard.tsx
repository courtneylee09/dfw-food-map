import ResourceCard from '../ResourceCard';

const mockResource = {
  id: '1',
  name: 'Cass Community Social Services',
  type: 'Food Pantry',
  address: '11850 Woodrow Wilson St, Detroit, MI 48206',
  latitude: '42.3690',
  longitude: '-83.0877',
  hours: 'Mon-Fri 10AM-2PM',
  isOpen: true,
  distance: '0.4 mi'
};

export default function ResourceCardExample() {
  return (
    <div className="p-4 space-y-4">
      <ResourceCard 
        resource={mockResource}
        onClick={() => console.log('Resource card clicked')}
      />
      <ResourceCard 
        resource={{ ...mockResource, id: '2', name: 'Southwest Fridge', type: 'Community Fridge', isOpen: false }}
        onClick={() => console.log('Resource card clicked')}
      />
    </div>
  );
}
