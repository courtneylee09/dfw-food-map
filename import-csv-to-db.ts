import { db } from './server/db';
import { foodResources } from '@shared/schema';
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

    return null;
  } catch (error) {
    console.error(`Error geocoding ${address}:`, error);
    return null;
  }
}

async function parseCSV(filePath: string): Promise<CSVRow[]> {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const headers = lines[0].replace(/^\uFEFF/, '').split(',');

  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

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
    values.push(currentValue);

    const row: any = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });

    rows.push(row as CSVRow);
  }

  return rows;
}

async function main() {
  console.log('Starting CSV import process...\n');

  const csvPath = path.join(process.cwd(), 'New Folder With Items 2', 'Imported table-Grid view.csv');
  const rows = await parseCSV(csvPath);

  console.log(`Found ${rows.length} rows in CSV\n`);

  let successCount = 0;
  let geocodedCount = 0;
  let failCount = 0;

  for (const row of rows) {
    try {
      let lat = row.latitude;
      let lon = row.longitude;

      // If missing coordinates, geocode the address
      if (!lat || !lon) {
        console.log(`Geocoding: ${row.name}`);
        const coords = await geocodeAddress(row.address);

        if (coords) {
          lat = coords.lat.toString();
          lon = coords.lon.toString();
          geocodedCount++;
          console.log(`  ✓ Geocoded: ${lat}, ${lon}`);
        } else {
          console.log(`  ✗ Could not geocode, skipping`);
          failCount++;
          continue;
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Normalize the type field - remove empty types
      let resourceType = row.type || 'Food Pantry';
      if (!resourceType.trim()) {
        resourceType = 'Food Pantry';
      }

      // Insert into database
      await db.insert(foodResources).values({
        id: row.id,
        name: row.name,
        type: resourceType,
        address: row.address,
        latitude: lat,
        longitude: lon,
        hours: row.hours || null,
        distance: row.distance || null,
      });

      successCount++;
      console.log(`✓ Imported: ${row.name}`);

    } catch (error: any) {
      // Check if it's a duplicate key error
      if (error.code === '23505') {
        console.log(`⚠ Skipped (already exists): ${row.name}`);
      } else {
        console.error(`✗ Failed to import ${row.name}:`, error.message);
        failCount++;
      }
    }
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Successfully imported: ${successCount}`);
  console.log(`Geocoded during import: ${geocodedCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total processed: ${rows.length}`);
}

main().catch(console.error).finally(() => process.exit(0));
