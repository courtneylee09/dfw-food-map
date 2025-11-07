import { pool } from './server/db';

async function addColumns() {
  const client = await pool.connect();

  try {
    console.log('Adding new columns to food_resources table...\n');

    // Add phone column
    try {
      await client.query(`
        ALTER TABLE food_resources
        ADD COLUMN IF NOT EXISTS phone text;
      `);
      console.log('✓ Added phone column');
    } catch (error: any) {
      console.log('Phone column may already exist:', error.message);
    }

    // Add appointment_required column
    try {
      await client.query(`
        ALTER TABLE food_resources
        ADD COLUMN IF NOT EXISTS appointment_required boolean DEFAULT false;
      `);
      console.log('✓ Added appointment_required column');
    } catch (error: any) {
      console.log('Appointment_required column may already exist:', error.message);
    }

    console.log('\n✓ Schema update complete!');
  } finally {
    client.release();
  }
}

addColumns().catch(console.error).finally(() => process.exit(0));
