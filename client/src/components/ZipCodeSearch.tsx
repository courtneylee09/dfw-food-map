import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface ZipCodeSearchProps {
  onSearch: (lat: number, lng: number, zipCode: string, maxDistance: number) => void;
  onClear: () => void;
  isLoading?: boolean;
  selectedDistance?: number;
}

type DistanceFilter = 5 | 10 | 15;

export default function ZipCodeSearch({ onSearch, onClear, isLoading = false, selectedDistance = 5 }: ZipCodeSearchProps) {
  const [zipCode, setZipCode] = useState('');
  const [error, setError] = useState('');
  const [currentDistance, setCurrentDistance] = useState<DistanceFilter>(selectedDistance as DistanceFilter);
  const [isGeocoding, setIsGeocoding] = useState(false);

  const geocodeZipCode = async (zip: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
      if (!apiKey) {
        console.error('Geoapify API key not configured');
        return null;
      }

      const response = await fetch(
        `https://api.geoapify.com/v1/geocode/search?postcode=${zip}&country=US&apiKey=${apiKey}`
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const { lat, lon } = data.features[0].properties;
        return { lat, lng: lon };
      }

      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // If zip code is empty, clear the search
    if (!zipCode.trim()) {
      handleClear();
      return;
    }

    // Validate zip code format (5 digits)
    if (!/^\d{5}$/.test(zipCode.trim())) {
      setError('Please enter a valid 5-digit zip code');
      return;
    }

    setIsGeocoding(true);
    const coords = await geocodeZipCode(zipCode.trim());
    setIsGeocoding(false);

    if (!coords) {
      setError('Could not find location for this zip code');
      return;
    }

    onSearch(coords.lat, coords.lng, zipCode.trim(), currentDistance);
  };

  const handleClear = () => {
    setZipCode('');
    setError('');
    setCurrentDistance(5);
    onClear();
  };

  const handleDistanceChange = async (distance: DistanceFilter) => {
    setCurrentDistance(distance);
    // If zip code is already set, re-search with new distance
    if (zipCode.length === 5 && !error) {
      setIsGeocoding(true);
      const coords = await geocodeZipCode(zipCode.trim());
      setIsGeocoding(false);
      
      if (coords) {
        onSearch(coords.lat, coords.lng, zipCode.trim(), distance);
      }
    }
  };

  return (
    <div className="w-full space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            inputMode="numeric"
            placeholder="Enter 5-digit zip code"
            value={zipCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 5);
              setZipCode(value);
              setError('');
            }}
            maxLength={5}
            className="w-full"
            data-testid="zip-code-input"
          />
        </div>
        <Button
          type="submit"
          disabled={isLoading || isGeocoding}
          className="min-h-11"
          data-testid="zip-search-button"
        >
          <Search className="w-5 h-5" />
        </Button>
        {zipCode && (
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="min-h-11"
            data-testid="zip-clear-button"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </form>
      {error && (
        <p className="text-sm text-red-500" data-testid="zip-error">{error}</p>
      )}
      {isGeocoding && (
        <p className="text-sm text-muted-foreground">Finding location...</p>
      )}
      {zipCode && zipCode.length === 5 && !error && !isGeocoding && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs font-medium text-muted-foreground self-center">Distance:</span>
          {[5, 10, 15].map((distance) => (
            <Button
              key={distance}
              type="button"
              variant={currentDistance === distance ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleDistanceChange(distance as DistanceFilter)}
              className="text-xs"
              data-testid={`distance-filter-${distance}`}
            >
              {distance}mi
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
