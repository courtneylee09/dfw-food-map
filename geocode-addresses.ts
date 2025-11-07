import { db } from './server/db';
import { foodResources } from '@shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface CSVRow {
  id: string;
  name: string;
  type: string;
  address: string;
  phone: string;
  latitude: string;
  longitude: string;
  hours: string;
  distance: string;
  appointment_required: string;
}

interface GeoapifyResponse {
  features: Array<{
    properties: {
      lat: number;
      lon: number;
      formatted: string;
    };
  }>;
}

const GEOAPIFY_API_KEY = process.env.VITE_GEOAPIFY_API_KEY;

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  if (!GEOAPIFY_API_KEY) {
    throw new Error('Geoapify API key not found');
  }

  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${GEOAPIFY_API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Failed to geocode ${address}: ${response.statusText}`);
      return null;
    }

    const data: GeoapifyResponse = await response.json();

    if (data.features && data.features.length > 0) {
      const { lat, lon } = data.features[0].properties;
      return { lat, lon };
    }

    console.warn(`No results found for address: ${address}`);
    return null;
  } catch (error) {
    console.error(`Error geocoding ${address}:`, error);
    return null;
  }
}

async function parseCSV(filePath: string): Promise<CSVRow[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].replace(/^\uFEFF/, '').split(','); // Remove BOM if present

  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    // Parse CSV line accounting for quoted fields
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue); // Push the last value

    const row: any = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });

    rows.push(row as CSVRow);
  }

  return rows;
}

async function main() {
  console.log('Starting geocoding process...\n');

  const csvPath = path.join(process.cwd(), 'New Folder With Items 2', 'Imported table-Grid view.csv');
  const rows = await parseCSV(csvPath);

  console.log(`Found ${rows.length} total rows in CSV`);

  // Find rows missing coordinates
  const missingCoords = rows.filter(row => !row.latitude || !row.longitude);
  console.log(`Found ${missingCoords.length} rows missing coordinates\n`);

  let successCount = 0;
  let failCount = 0;

  for (const row of missingCoords) {
    console.log(`Geocoding: ${row.name} - ${row.address}`);

    const coords = await geocodeAddress(row.address);

    if (coords) {
      console.log(`  ✓ Found: ${coords.lat}, ${coords.lon}`);

      try {
        // Update the database
        await db.update(foodResources)
          .set({
            latitude: coords.lat.toString(),
            longitude: coords.lon.toString(),
          })
          .where(eq(foodResources.id, row.id));

        successCount++;
        console.log(`  ✓ Updated database`);
      } catch (error) {
        console.error(`  ✗ Failed to update database:`, error);
        failCount++;
      }
    } else {
      console.log(`  ✗ Could not geocode`);
      failCount++;
    }

    // Rate limiting - wait 200ms between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n=== Geocoding Complete ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total processed: ${missingCoords.length}`);
}

main().catch(console.error);
