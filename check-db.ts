import { db } from './server/db';
import { foodResources } from '@shared/schema';

async function checkDatabase() {
  console.log('Checking database contents...\n');

  const allResources = await db.select().from(foodResources);

  console.log(`Total resources in database: ${allResources.length}`);
  console.log(`\nResources with missing coordinates:`);

  const missing = allResources.filter(r => !r.latitude || !r.longitude || r.latitude === '' || r.longitude === '');

  console.log(`Count: ${missing.length}\n`);

  if (missing.length > 0) {
    console.log('First 10 missing:');
    missing.slice(0, 10).forEach(r => {
      console.log(`- ${r.name} (${r.address})`);
    });
  }

  console.log(`\nResources with coordinates:`);
  const withCoords = allResources.filter(r => r.latitude && r.longitude && r.latitude !== '' && r.longitude !== '');
  console.log(`Count: ${withCoords.length}\n`);

  if (withCoords.length > 0) {
    console.log('First 10 with coords:');
    withCoords.slice(0, 10).forEach(r => {
      console.log(`- ${r.name}: ${r.latitude}, ${r.longitude}`);
    });
  }
}

checkDatabase().catch(console.error).finally(() => process.exit(0));
