import { db } from '../server/db';
import { foodResources } from '@shared/schema';
import { eq, or, isNull } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface GeoapifyResponse {
  features: Array<{
    properties: {
      lat: number;
      lon: number;
      formatted: string;
      result_type?: string;
      rank?: {
        confidence: number;
      };
    };
  }>;
}

const GEOAPIFY_API_KEY = process.env.VITE_GEOAPIFY_API_KEY || process.env.GEOAPIFY_API_KEY;
const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 250; // ms between requests
const RETRY_DELAY = 1000; // ms to wait before retry

// Dallas-Fort Worth bounding box for validation (optional)
const DFW_BOUNDS = {
  minLat: 32.3,
  maxLat: 33.4,
  minLon: -97.9,
  maxLon: -96.2
};

interface GeocodingResult {
  name: string;
  address: string;
  success: boolean;
  lat?: number;
  lon?: number;
  error?: string;
  confidence?: number;
}

async function geocodeAddressWithRetry(
  address: string,
  retries = MAX_RETRIES
): Promise<{ lat: number; lon: number; confidence: number } | null> {
  if (!GEOAPIFY_API_KEY) {
    throw new Error('GEOAPIFY_API_KEY or VITE_GEOAPIFY_API_KEY environment variable is required');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${GEOAPIFY_API_KEY}`;
      const response = await fetch(url);

      // Handle rate limiting
      if (response.status === 429) {
        console.warn(`  ⚠ Rate limit hit, waiting ${RETRY_DELAY * attempt}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        continue;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: GeoapifyResponse = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const { lat, lon } = feature.properties;
        const confidence = feature.properties.rank?.confidence || 0;

        // Validate coordinates are within expected bounds (optional)
        if (lat < DFW_BOUNDS.minLat || lat > DFW_BOUNDS.maxLat ||
            lon < DFW_BOUNDS.minLon || lon > DFW_BOUNDS.maxLon) {
          console.warn(`  ⚠ Warning: Coordinates outside Dallas-Fort Worth area (${lat}, ${lon})`);
          console.warn(`    Formatted: ${feature.properties.formatted}`);
          // Continue anyway - don't fail, just warn
        }

        return { lat, lon, confidence };
      }

      console.warn(`  ⚠ No results found for address (attempt ${attempt}/${retries})`);

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }

    } catch (error: any) {
      console.error(`  ✗ Error on attempt ${attempt}/${retries}: ${error.message}`);

      if (attempt < retries) {
        console.log(`  ↻ Retrying in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  return null;
}

async function validateApiKey(): Promise<boolean> {
  if (!GEOAPIFY_API_KEY) {
    console.error('❌ ERROR: No API key found!');
    console.error('Please set GEOAPIFY_API_KEY or VITE_GEOAPIFY_API_KEY in your .env file');
    console.error('Get a free key at: https://www.geoapify.com/');
    return false;
  }

  console.log('✓ API key found, testing...');

  try {
    const testUrl = `https://api.geoapify.com/v1/geocode/search?text=Dallas&apiKey=${GEOAPIFY_API_KEY}`;
    const response = await fetch(testUrl);

    if (response.status === 401 || response.status === 403) {
      console.error('❌ ERROR: API key is invalid or expired');
      return false;
    }

    if (!response.ok) {
      console.error(`❌ ERROR: API test failed with status ${response.status}`);
      return false;
    }

    console.log('✓ API key is valid\n');
    return true;
  } catch (error: any) {
    console.error(`❌ ERROR: Could not validate API key: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('=== Geocoding Tool ===\n');

  // Validate API key first
  const apiKeyValid = await validateApiKey();
  if (!apiKeyValid) {
    process.exit(1);
  }

  // Find resources missing coordinates from database
  console.log('Searching database for resources missing coordinates...\n');

  const resourcesMissingCoords = await db
    .select()
    .from(foodResources)
    .where(
      or(
        isNull(foodResources.latitude),
        isNull(foodResources.longitude),
        eq(foodResources.latitude, ''),
        eq(foodResources.longitude, '')
      )
    );

  console.log(`Found ${resourcesMissingCoords.length} resources needing geocoding\n`);

  if (resourcesMissingCoords.length === 0) {
    console.log('✓ All resources already have coordinates!');
    process.exit(0);
  }

  const results: GeocodingResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < resourcesMissingCoords.length; i++) {
    const resource = resourcesMissingCoords[i];
    console.log(`[${i + 1}/${resourcesMissingCoords.length}] ${resource.name}`);
    console.log(`  Address: ${resource.address}`);

    // Validate address is not empty
    if (!resource.address || resource.address.trim() === '') {
      console.error('  ✗ Empty address, skipping');
      results.push({
        name: resource.name,
        address: resource.address,
        success: false,
        error: 'Empty address'
      });
      failCount++;
      continue;
    }

    const coords = await geocodeAddressWithRetry(resource.address);

    if (coords) {
      console.log(`  ✓ Geocoded: ${coords.lat}, ${coords.lon} (confidence: ${coords.confidence})`);

      try {
        // Update the database
        await db
          .update(foodResources)
          .set({
            latitude: coords.lat.toString(),
            longitude: coords.lon.toString(),
          })
          .where(eq(foodResources.id, resource.id));

        console.log(`  ✓ Updated database\n`);

        results.push({
          name: resource.name,
          address: resource.address,
          success: true,
          lat: coords.lat,
          lon: coords.lon,
          confidence: coords.confidence
        });

        successCount++;
      } catch (error: any) {
        console.error(`  ✗ Failed to update database: ${error.message}\n`);

        results.push({
          name: resource.name,
          address: resource.address,
          success: false,
          error: `Database update failed: ${error.message}`
        });

        failCount++;
      }
    } else {
      console.log(`  ✗ Could not geocode after ${MAX_RETRIES} attempts\n`);

      results.push({
        name: resource.name,
        address: resource.address,
        success: false,
        error: 'Geocoding failed after retries'
      });

      failCount++;
    }

    // Rate limiting between requests
    if (i < resourcesMissingCoords.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  // Save results to file
  const resultsPath = path.join(process.cwd(), 'geocoding-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n✓ Detailed results saved to: ${resultsPath}`);

  // Save failed addresses to separate file for manual review
  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    const failedPath = path.join(process.cwd(), 'geocoding-failed.json');
    fs.writeFileSync(failedPath, JSON.stringify(failed, null, 2));
    console.log(`✓ Failed addresses saved to: ${failedPath} for manual review`);
  }

  console.log(`\n=== Geocoding Complete ===`);
  console.log(`✓ Success: ${successCount}`);
  console.log(`✗ Failed: ${failCount}`);
  console.log(`Total processed: ${resourcesMissingCoords.length}`);
  console.log(`Success rate: ${((successCount / resourcesMissingCoords.length) * 100).toFixed(1)}%`);

  if (failCount > 0) {
    console.log(`\n⚠ Some addresses failed to geocode. Check geocoding-failed.json for details.`);
    console.log('Tips for fixing failed geocodes:');
    console.log('  - Verify addresses are complete with city, state, and zip');
    console.log('  - Check for typos or formatting issues');
    console.log('  - Try manually geocoding at https://www.geoapify.com/tools/geocoding-online');
    console.log('  - You can manually add coordinates to your CSV and re-import');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
