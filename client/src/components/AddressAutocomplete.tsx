import { useEffect, useRef } from 'react';
import { GeocoderAutocomplete } from '@geoapify/geocoder-autocomplete';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';

interface AddressAutocompleteProps {
  onSelect: (address: {
    formatted: string;
    lat: number;
    lon: number;
  }) => void;
  placeholder?: string;
  className?: string;
  'data-testid'?: string;
}

export default function AddressAutocomplete({
  onSelect,
  placeholder = 'Start typing an address...',
  className = '',
  'data-testid': testId,
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<GeocoderAutocomplete | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
    
    console.log('Initializing Geoapify with API key:', apiKey ? 'Present' : 'Missing');
    
    if (!apiKey) {
      console.warn('Geoapify API key not found. Address autocomplete will not work.');
      return;
    }

    try {
      const autocomplete = new GeocoderAutocomplete(
        containerRef.current,
        apiKey,
        {
          placeholder,
          lang: 'en',
          filter: {
            countrycode: ['us'],
          },
          bias: {
            countrycode: ['us'],
            proximity: { lat: 42.3314, lon: -83.0458 },
          },
        }
      );

      console.log('Geoapify autocomplete initialized successfully');

      autocomplete.on('select', (location: any) => {
        console.log('Location selected:', location);
        if (location?.properties) {
          const formatted = location.properties.formatted || location.properties.address_line1;
          const lat = location.properties.lat;
          const lon = location.properties.lon;
          
          if (formatted && lat && lon) {
            onSelect({ formatted, lat, lon });
          }
        }
      });

      autocompleteRef.current = autocomplete;

      return () => {
        autocomplete.off('select');
      };
    } catch (error) {
      console.error('Error initializing Geoapify autocomplete:', error);
    }
  }, [onSelect, placeholder]);

  return (
    <div 
      ref={containerRef} 
      className={className}
      data-testid={testId}
    />
  );
}
