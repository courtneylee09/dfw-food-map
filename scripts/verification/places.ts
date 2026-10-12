import type { FoodResource } from "../../shared/schema";

// Google Places API (New) lookup for a listing. Uses the server-side key
// (GOOGLE_PLACES_API_KEY), which is restricted to Places API (New) only.

export interface PlaceMatch {
  placeId: string;
  name: string;
  address: string;
  businessStatus: string | null;
  phone: string | null;
  website: string | null;
  hours: string[] | null;
  googleMapsUrl: string | null;
  distanceMeters: number;
}

export interface PlacesResult {
  match: PlaceMatch | null;
  // Nearby candidates that didn't clearly match, so the agent can judge
  candidates: PlaceMatch[];
  error?: string;
}

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.businessStatus",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.regularOpeningHours.weekdayDescriptions",
  "places.googleMapsUri",
].join(",");

// A result within this distance of the listing's coordinates counts as a match
const MATCH_RADIUS_METERS = 250;

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function lookupPlace(listing: FoodResource): Promise<PlacesResult> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { match: null, candidates: [], error: "GOOGLE_PLACES_API_KEY not set" };

  const lat = parseFloat(listing.latitude);
  const lng = parseFloat(listing.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const body: Record<string, unknown> = {
    textQuery: `${listing.name}, ${listing.address}`,
    maxResultCount: 5,
  };
  if (hasCoords) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 2000 } };
  }

  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    return { match: null, candidates: [], error: data?.error?.message || `HTTP ${response.status}` };
  }

  const places: PlaceMatch[] = (data.places || []).map((p: any) => ({
    placeId: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    businessStatus: p.businessStatus ?? null,
    phone: p.nationalPhoneNumber ?? null,
    website: p.websiteUri ?? null,
    hours: p.regularOpeningHours?.weekdayDescriptions ?? null,
    googleMapsUrl: p.googleMapsUri ?? null,
    distanceMeters:
      hasCoords && p.location
        ? Math.round(distanceMeters(lat, lng, p.location.latitude, p.location.longitude))
        : -1,
  }));

  const closest = places
    .filter((p) => p.distanceMeters >= 0 && p.distanceMeters <= MATCH_RADIUS_METERS)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];

  return {
    match: closest ?? null,
    candidates: places.filter((p) => p !== closest).slice(0, 3),
  };
}
