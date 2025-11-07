import { db } from './server/db';
import { foodResources } from '@shared/schema';

async function finalCheck() {
  console.log('=== Final Database Check ===\n');

  const allResources = await db.select().from(foodResources);

  console.log(`Total resources: ${allResources.length}`);
  console.log(`Resources with coordinates: ${allResources.filter(r => r.latitude && r.longitude).length}`);
  console.log(`Resources with phone: ${allResources.filter(r => r.phone).length}`);
  console.log(`Resources requiring appointment: ${allResources.filter(r => r.appointmentRequired).length}`);

  console.log(`\n=== Sample Records ===\n`);

  // Show 3 sample records with all fields
  allResources.slice(0, 3).forEach(r => {
    console.log(`Name: ${r.name}`);
    console.log(`Type: ${r.type}`);
    console.log(`Address: ${r.address}`);
    console.log(`Coordinates: ${r.latitude}, ${r.longitude}`);
    console.log(`Phone: ${r.phone || 'N/A'}`);
    console.log(`Hours: ${r.hours || 'N/A'}`);
    console.log(`Appointment Required: ${r.appointmentRequired ? 'Yes' : 'No'}`);
    console.log('---\n');
  });
}

finalCheck().catch(console.error).finally(() => process.exit(0));
