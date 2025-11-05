import ResourceDetail from '../ResourceDetail';

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

export default function ResourceDetailExample() {
  return (
    <div className="h-screen">
      <ResourceDetail
        resource={mockResource}
        onBack={() => console.log('Back clicked')}
        onSuggestUpdate={() => console.log('Suggest update clicked')}
      />
    </div>
  );
}
