import { Backpack, Carrot, HeartHandshake, Refrigerator, ShoppingBasket, Soup } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Category } from '@shared/categories';
import { getCategoryColor } from '@/lib/categoryColors';

export type ResourceType = Category;

export const categoryIcons: Record<Category, React.ElementType> = {
  'Food Pantry': ShoppingBasket,
  'Free Meals': Soup,
  "Kids' Free Meals": Backpack,
  'Senior Meals': HeartHandshake,
  'Food Distribution': Carrot,
  'Community Fridge': Refrigerator,
};

// Marker images are identical per category, so build each one once
const iconCache = new Map<string, google.maps.Icon>();

// App-icon tile marker: rounded colored square with a white icon and a pointer
export function createGoogleMapIcon(type: ResourceType, isSelected: boolean = false): google.maps.Icon {
  const cacheKey = `${type}|${isSelected}`;
  const cached = iconCache.get(cacheKey);
  if (cached) return cached;

  const colors = getCategoryColor(type);
  const Icon = categoryIcons[type] || ShoppingBasket;
  const iconSvg = renderToStaticMarkup(<Icon size={20} color="#ffffff" strokeWidth={2.25} />)
    .replace('<svg ', '<svg x="12" y="10" ');

  const scale = isSelected ? 1.2 : 1;
  const width = 44 * scale;
  const height = 54 * scale;

  const svgString = `
    <svg width="${width}" height="${height}" viewBox="0 0 44 54" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#s)">
        <path d="M15 39 L29 39 L22 50 Z" fill="${colors.dark}" />
        <rect x="4" y="2" width="36" height="38" rx="11" fill="${colors.fill}" stroke="${colors.dark}" stroke-width="2" />
      </g>
      ${iconSvg}
    </svg>
  `;

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const icon: google.maps.Icon = {
    url: URL.createObjectURL(svgBlob),
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(width / 2, height - 4 * scale),
  };
  iconCache.set(cacheKey, icon);
  return icon;
}

// Legacy function for Leaflet (kept for compatibility, but not used with Google Maps)
export function createCustomIcon(type: ResourceType, isSelected: boolean = false): any {
  // This is no longer used but kept for type compatibility
  return null;
}
