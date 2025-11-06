import { useEffect, useRef } from 'react';
import { GeocoderAutocomplete } from '@geoapify/geocoder-autocomplete';
import '@geoapify/geocoder-autocomplete/styles/minimal.css';
import { Input } from '@/components/ui/input';

interface AddressAutocompleteProps {
  onSelect: (address: {
    formatted: string;
    lat: number;
    lon: number;
  }) => void;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'data-testid'?: string;
}

export default function AddressAutocomplete({
  onSelect,
  value,
  onChange,
  placeholder = 'Start typing an address...',
  className = 'min-h-11 text-base',
  'data-testid': testId,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<GeocoderAutocomplete | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
    
    if (!apiKey) {
      console.warn('Geoapify API key not found. Address autocomplete will not work.');
      return;
    }

    const autocomplete = new GeocoderAutocomplete(
      inputRef.current,
      apiKey,
      {
        placeholder,
        type: 'amenity',
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

    autocomplete.on('select', (location: any) => {
      if (location?.properties) {
        const formatted = location.properties.formatted || location.properties.address_line1;
        const lat = location.properties.lat;
        const lon = location.properties.lon;
        
        if (formatted && lat && lon) {
          onSelect({ formatted, lat, lon });
        }
      }
    });

    autocomplete.on('input', (value: string) => {
      onChange(value);
    });

    autocompleteRef.current = autocomplete;

    return () => {
      autocomplete.off('select');
      autocomplete.off('input');
    };
  }, [onSelect, onChange, placeholder]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      data-testid={testId}
    />
  );
}
