import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { FoodResource } from '@shared/schema';
import { createGoogleMapIcon, type ResourceType } from './MapIcons';

interface ResourceMapProps {
  resources: FoodResource[];
  center: [number, number];
  zoom?: number;
  onResourceClick?: (resource: FoodResource) => void;
  selectedResourceId?: string;
  searchedZip?: string | null;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

function escapeHtml(unsafe: string) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default function ResourceMap({ 
  resources, 
  center, 
  zoom = 13,
  onResourceClick,
  selectedResourceId,
  searchedZip,
}: ResourceMapProps) {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  const centerLatLng = useMemo(() => ({
    lat: center[0],
    lng: center[1],
  }), [center]);

  const handleMarkerClick = useCallback((resource: FoodResource) => {
    setSelectedMarker(resource.id);
    onResourceClick?.(resource);
  }, [onResourceClick]);

  const handleMapClick = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  // initialize InfoWindow when map becomes available
  useEffect(() => {
    if (!map) return;
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }
  }, [map]);

  // Clean up markers on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((m) => {
        try { (m as any).setMap?.(null); } catch (e) { }
      });
      markersRef.current.clear();
      if (infoWindowRef.current) {
        try { infoWindowRef.current.close(); } catch (e) { /* ignore */ }
        infoWindowRef.current = null;
      }
    };
  }, []);

  // Recreate markers whenever resources or map change
  useEffect(() => {
    if (!map) return;

    // remove existing markers
    markersRef.current.forEach((m) => {
      try { m.setMap(null); } catch (e) { /* ignore */ }
    });
    markersRef.current.clear();

    resources.forEach((resource) => {
      const lat = parseFloat(resource.latitude as unknown as string);
      const lng = parseFloat(resource.longitude as unknown as string);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const position = { lat, lng };
      const isSelected = resource.id === selectedResourceId || resource.id === selectedMarker;
      const icon = createGoogleMapIcon(resource.type as ResourceType, isSelected);

      // create AdvancedMarkerElement if available
      try {
        // marker constructor is under google.maps.marker.AdvancedMarkerElement
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const AdvancedMarker = (google.maps as any).marker?.AdvancedMarkerElement;
        let marker: any;
        const hasMapId = !!(map as any).mapId;
        if (AdvancedMarker && hasMapId) {
          // AdvancedMarkerElement does not accept 'icon' property; create a DOM element for content
          const el = document.createElement('div');
          el.style.display = 'inline-block';
          el.style.lineHeight = '0';
          const img = document.createElement('img');
          img.src = (icon && (icon as any).url) || '';
          img.style.width = `${(icon as any).scaledSize?.width || 40}px`;
          img.style.height = `${(icon as any).scaledSize?.height || 50}px`;
          img.style.transform = 'translateY(-100%)';
          el.appendChild(img);

          marker = new AdvancedMarker({ position, map, title: resource.name, content: el });
        } else {
          // fallback to classic Marker if AdvancedMarker not available
          marker = new google.maps.Marker({ position, title: resource.name, map, icon });
        }

        marker.addListener('click', () => {
          if (infoWindowRef.current) {
            const approxText = typeof resource.distance === 'number' && searchedZip
              ? `Approx ${Math.round(resource.distance)} miles from ${searchedZip}`
              : undefined;
            const content = `<div style="max-width:220px"><strong>${escapeHtml(resource.name)}</strong><div style=\"font-size:12px;color:#444;\">${escapeHtml(resource.type || '')}</div>${resource.address ? `<div style=\"font-size:12px;color:#444;\">${escapeHtml(resource.address)} </div>` : ''}${approxText ? `<div style=\"margin-top:6px;font-size:12px;color:#666;\">${escapeHtml(approxText)}</div>` : ''}</div>`;
            infoWindowRef.current.setContent(content);
            // For AdvancedMarker, anchor by position
            infoWindowRef.current.setPosition(position);
            infoWindowRef.current.open({ map });
          }
          setSelectedMarker(resource.id);
          onResourceClick?.(resource);
        });

        markersRef.current.set(resource.id, marker);
      } catch (err) {
        // If marker creation fails, skip silently but log for debugging
        // eslint-disable-next-line no-console
        console.warn('[ResourceMap] failed to create marker for', resource.id, err);
      }
    });
  }, [resources, map, selectedResourceId, selectedMarker, onResourceClick, searchedZip]);

  return (
    <div className="h-full w-full relative" data-testid="map-container">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={centerLatLng}
        zoom={zoom}
        options={defaultOptions}
        onClick={handleMapClick}
        onLoad={(m) => setMap(m)}
      >
        {/* Markers are created imperatively in useEffect to support AdvancedMarkerElement */}
      </GoogleMap>
    </div>
  );
}
