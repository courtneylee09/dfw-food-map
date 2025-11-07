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
  console.log('Updating phone numbers and appointment requirements...\n');

  const csvPath = path.join(process.cwd(), 'New Folder With Items 2', 'Imported table-Grid view.csv');
  const rows = await parseCSV(csvPath);

  let successCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    try {
      const appointmentRequired = row.appointment_required.toLowerCase() === 'yes';
      const phone = row.phone || null;

      await db.update(foodResources)
        .set({
          phone: phone,
          appointmentRequired: appointmentRequired,
        })
        .where(eq(foodResources.id, row.id));

      console.log(`✓ Updated: ${row.name}`);
      if (phone) console.log(`  Phone: ${phone}`);
      if (appointmentRequired) console.log(`  Appointment Required: Yes`);

      successCount++;
    } catch (error: any) {
      console.error(`✗ Failed to update ${row.name}:`, error.message);
      skippedCount++;
    }
  }

  console.log(`\n=== Update Complete ===`);
  console.log(`Successfully updated: ${successCount}`);
  console.log(`Failed: ${skippedCount}`);
  console.log(`Total processed: ${rows.length}`);
}

main().catch(console.error).finally(() => process.exit(0));
