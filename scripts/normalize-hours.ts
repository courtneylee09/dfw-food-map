import { db } from '../server/db';
import { foodResources } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { normalizeHours } from '@shared/hours';

async function main() {
  if (!db) {
    throw new Error('Database not configured');
  }

  const resources = await db.select().from(foodResources);

  let changed = 0;

  for (const resource of resources) {
    const nextHours = normalizeHours({
      hours: resource.hours,
      type: resource.type,
      name: resource.name,
      phone: resource.phone,
      appointmentRequired: resource.appointmentRequired,
    });
    const currentHours = resource.hours ?? '';

    if (nextHours !== currentHours) {
      await db
        .update(foodResources)
        .set({
          hours: nextHours,
          lastVerifiedDate: new Date(),
          verificationSource: 'hours-normalized',
        })
        .where(eq(foodResources.id, resource.id));

      changed++;
      console.log(`Updated ${resource.name}: "${currentHours}" -> "${nextHours}"`);
    }
  }

  console.log(`\nDone. Updated ${changed} of ${resources.length} resources.`);
}

main()
  .catch((error) => {
    console.error('Failed to normalize hours:', error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
