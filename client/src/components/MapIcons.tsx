import { DivIcon } from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server';
import { UtensilsCrossed, Refrigerator, Store, Soup, Users, User, ShoppingCart } from 'lucide-react';

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
  'Youth Supper (CACFP)': {
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

export function createCustomIcon(type: ResourceType, isSelected: boolean = false): DivIcon {
  const config = iconConfig[type] || iconConfig['Food Pantry'];
  const Icon = config.Icon;
  
  const scale = isSelected ? 1.15 : 1;
  const shadowClass = isSelected ? 'shadow-lg' : 'shadow-md';
  
  const iconHtml = renderToStaticMarkup(
    <div
      className={`relative flex items-center justify-center ${shadowClass}`}
      style={{
        width: `${40 * scale}px`,
        height: `${50 * scale}px`,
        transform: `translate(-${20 * scale}px, -${50 * scale}px)`,
      }}
    >
      <svg
        width={40 * scale}
        height={50 * scale}
        viewBox="0 0 40 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M20 0C11.716 0 5 6.716 5 15c0 8.284 15 35 15 35s15-26.716 15-35c0-8.284-6.716-15-15-15z"
          fill={config.bgColor}
          stroke={config.color}
          strokeWidth="2"
        />
        <circle cx="20" cy="15" r="8" fill="white" />
      </svg>
      <div
        className="absolute flex items-center justify-center"
        style={{
          top: `${7 * scale}px`,
          left: '50%',
          transform: 'translateX(-50%)',
          width: `${16 * scale}px`,
          height: `${16 * scale}px`,
        }}
      >
        <Icon
          size={14 * scale}
          style={{ color: config.color }}
          strokeWidth={2.5}
        />
      </div>
    </div>
  );

  return new DivIcon({
    html: iconHtml,
    className: 'custom-map-marker',
    iconSize: [40 * scale, 50 * scale],
    iconAnchor: [20 * scale, 50 * scale],
    popupAnchor: [0, -50 * scale],
  });
}
