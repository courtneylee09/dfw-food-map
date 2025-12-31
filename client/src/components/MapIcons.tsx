import { UtensilsCrossed, Refrigerator, Store, Soup, Users, User, ShoppingCart } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';

export type ResourceType = 'Food Pantry' | 'Community Fridge' | 'Soup Kitchen' | 'Hot Meal' | 'Youth Supper (CACFP)' | 'Senior Meals' | 'Grocery Distribution';

const iconConfig: Record<ResourceType, { Icon: React.ElementType; color: string; bgColor: string }> = {
  'Food Pantry': {
    Icon: Store,
    color: '#8B5837',
    bgColor: '#C47A4D',
  },
  'Community Fridge': {
    Icon: Refrigerator,
    color: '#4A8A5C',
    bgColor: '#6BAF7D',
  },
  'Soup Kitchen': {
    Icon: Soup,
    color: '#A65661',
    bgColor: '#D07A82',
  },
  'Hot Meal': {
    Icon: UtensilsCrossed,
    color: '#A87F36',
    bgColor: '#D8A44C',
  },
  'Youth Supper': {
    Icon: Users,
    color: '#7366A0',
    bgColor: '#9E8BC2',
  },
  'Senior Meals': {
    Icon: User,
    color: '#506B8A',
    bgColor: '#6F8FAF',
  },
  'Grocery Distribution': {
    Icon: ShoppingCart,
    color: '#6A763F',
    bgColor: '#8E9F56',
  },
};

// Create icon for Google Maps using SVG data URL
export function createGoogleMapIcon(type: ResourceType, isSelected: boolean = false): google.maps.Icon {
  const config = iconConfig[type] || iconConfig['Food Pantry'];
  
  const scale = isSelected ? 1.15 : 1;
  const size = 40 * scale;
  const height = 50 * scale;
  
  // Create SVG with icon embedded
  const svgString = `
    <svg width="${size}" height="${height}" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M20 0C11.716 0 5 6.716 5 15c0 8.284 15 35 15 35s15-26.716 15-35c0-8.284-6.716-15-15-15z"
        fill="${config.bgColor}"
        stroke="${config.color}"
        stroke-width="2"
      />
      <circle cx="20" cy="15" r="8" fill="white" />
    </svg>
  `;

  // Convert SVG to data URL
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  return {
    url: url,
    scaledSize: new google.maps.Size(size, height),
    anchor: new google.maps.Point(size / 2, height),
  };
}

// Legacy function for Leaflet (kept for compatibility, but not used with Google Maps)
export function createCustomIcon(type: ResourceType, isSelected: boolean = false): any {
  // This is no longer used but kept for type compatibility
  return null;
}
