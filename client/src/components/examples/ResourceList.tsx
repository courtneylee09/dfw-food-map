import ResourceList from '../ResourceList';

const mockResources = [
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
];

export default function ResourceListExample() {
  return (
    <ResourceList
      resources={mockResources}
      onResourceClick={(resource) => console.log('Resource clicked:', resource.name)}
    />
  );
}
