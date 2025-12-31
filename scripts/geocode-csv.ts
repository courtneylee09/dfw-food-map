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

// Dallas-Fort Worth bounding box for validation
const DFW_BOUNDS = {
  minLat: 32.3,
  maxLat: 33.4,
  minLon: -97.9,
  maxLon: -96.2
};

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

        // Validate coordinates are within expected bounds
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

function parseCSV(content: string): CSVRow[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row as CSVRow);
  }
  
  return rows;
}

function toCSV(rows: CSVRow[]): string {
  const headers = ['id', 'name', 'type', 'address', 'phone', 'latitude', 'longitude', 'hours', 'distance', 'appointment_required'];
  
  const csvLines = [headers.join(',')];
  
  for (const row of rows) {
    const values = headers.map(header => {
      const value = (row as any)[header] || '';
      // Quote values that contain commas
      if (value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    });
    csvLines.push(values.join(','));
  }
  
  return csvLines.join('\n');
}

async function main() {
  console.log('=== CSV Geocoding Tool ===\n');

  // Validate API key first
  const apiKeyValid = await validateApiKey();
  if (!apiKeyValid) {
    process.exit(1);
  }

  const csvPath = path.join(process.cwd(), 'data', 'sample-food-resources.csv');
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ ERROR: CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  console.log(`Reading CSV from: ${csvPath}\n`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(csvContent);
  
  console.log(`Found ${rows.length} rows in CSV\n`);

  // Find rows missing coordinates
  const rowsMissingCoords = rows.filter(row => 
    !row.latitude || row.latitude.trim() === '' || 
    !row.longitude || row.longitude.trim() === ''
  );

  console.log(`Found ${rowsMissingCoords.length} rows needing geocoding\n`);

  if (rowsMissingCoords.length === 0) {
    console.log('✓ All rows already have coordinates!');
    process.exit(0);
  }

  let successCount = 0;
  let failCount = 0;
  const failedRows: any[] = [];

  for (let i = 0; i < rowsMissingCoords.length; i++) {
    const row = rowsMissingCoords[i];
    console.log(`[${i + 1}/${rowsMissingCoords.length}] ${row.name}`);
    console.log(`  Address: ${row.address}`);

    // Validate address is not empty
    if (!row.address || row.address.trim() === '') {
      console.error('  ✗ Empty address, skipping\n');
      failedRows.push({ ...row, error: 'Empty address' });
      failCount++;
      continue;
    }

    const coords = await geocodeAddressWithRetry(row.address);

    if (coords) {
      console.log(`  ✓ Geocoded: ${coords.lat}, ${coords.lon} (confidence: ${coords.confidence})`);
      
      // Update the row with coordinates
      row.latitude = coords.lat.toString();
      row.longitude = coords.lon.toString();
      
      console.log(`  ✓ Coordinates added to row\n`);
      successCount++;
    } else {
      console.log(`  ✗ Could not geocode after ${MAX_RETRIES} attempts\n`);
      failedRows.push({ ...row, error: 'Geocoding failed after retries' });
      failCount++;
    }

    // Rate limiting between requests
    if (i < rowsMissingCoords.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
    }
  }

  // Write updated CSV back to file
  const updatedCSV = toCSV(rows);
  fs.writeFileSync(csvPath, updatedCSV, 'utf-8');
  console.log(`\n✓ Updated CSV saved to: ${csvPath}`);

  // Save failed rows to separate file for manual review
  if (failedRows.length > 0) {
    const failedPath = path.join(process.cwd(), 'geocoding-failed.json');
    fs.writeFileSync(failedPath, JSON.stringify(failedRows, null, 2));
    console.log(`✓ Failed addresses saved to: ${failedPath} for manual review`);
  }

  console.log(`\n=== Geocoding Complete ===`);
  console.log(`✓ Success: ${successCount}`);
  console.log(`✗ Failed: ${failCount}`);
  console.log(`Total processed: ${rowsMissingCoords.length}`);
  console.log(`Success rate: ${((successCount / rowsMissingCoords.length) * 100).toFixed(1)}%`);

  if (failCount > 0) {
    console.log(`\n⚠ Some addresses failed to geocode. Check geocoding-failed.json for details.`);
    console.log('Tips for fixing failed geocodes:');
    console.log('  - Verify addresses are complete with city, state, and zip');
    console.log('  - Check for typos or formatting issues');
    console.log('  - Try manually geocoding at https://www.geoapify.com/tools/geocoding-online');
  }

  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
