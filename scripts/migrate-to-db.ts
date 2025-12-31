import { db } from "../server/db";
import { foodResources } from "@shared/schema";

// Sample data to migrate to database
const sampleData = [
  {
    name: 'Community Food Resource',
    type: 'Food Pantry',
    address: '1854 Shanna Dr, Lancaster, TX 75134',
    latitude: '32.5921',
    longitude: '-96.7561',
    hours: 'Mon-Fri: 9:00am-5:00pm',
    distance: null,
    phone: null,
    appointmentRequired: false,
  },
  {
    name: 'Dallas Food Bank',
    type: 'Food Pantry',
    address: '4500 S Cockrell Hill Rd, Dallas, TX 75236',
    latitude: '32.7767',
    longitude: '-96.7970',
    hours: 'Mon-Sat: 8:00am-4:00pm',
    distance: null,
    phone: '(214) 330-1396',
    appointmentRequired: false,
  },
  {
    name: 'Community Fridge - Oak Cliff',
    type: 'Community Fridge',
    address: '123 Main St, Dallas, TX 75208',
    latitude: '32.7505',
    longitude: '-96.8369',
    hours: '24/7',
    distance: null,
    phone: null,
    appointmentRequired: false,
  },
  {
    name: 'Hot Meal Program',
    type: 'Hot Meal',
    address: '500 Elm St, Dallas, TX 75202',
    latitude: '32.7767',
    longitude: '-96.7970',
    hours: 'Daily: 11:00am-1:00pm',
    distance: null,
    phone: '(214) 555-1234',
    appointmentRequired: false,
  },
];

async function migrate() {
  if (!db) {
    console.error("❌ Database not configured. Please set DATABASE_URL environment variable.");
    process.exit(1);
  }

  try {
    console.log("🔄 Migrating sample data to database...\n");

    // Check if data already exists
    const existing = await db.select().from(foodResources);
    if (existing.length > 0) {
      console.log(`⚠️  Found ${existing.length} existing resources in database.`);
      console.log("   Skipping migration to avoid duplicates.");
      console.log("   If you want to add this data, delete existing records first.\n");
      process.exit(0);
    }

    // Insert sample data
    for (const resource of sampleData) {
      await db.insert(foodResources).values(resource);
      console.log(`✓ Added: ${resource.name}`);
    }

    console.log(`\n✅ Successfully migrated ${sampleData.length} resources to database!`);
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Error migrating data:", error.message);
    process.exit(1);
  }
}

migrate();



