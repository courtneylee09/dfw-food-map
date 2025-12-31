import { db } from '../server/db';
import { submissions } from '@shared/schema';
import { desc } from 'drizzle-orm';

async function checkSubmissions() {
  if (!db) {
    console.error('❌ Database not configured');
    process.exit(1);
  }

  try {
    console.log('📋 Checking submissions...\n');

    const allSubmissions = await db
      .select()
      .from(submissions)
      .orderBy(desc(submissions.submittedAt));

    console.log(`Total submissions: ${allSubmissions.length}\n`);

    if (allSubmissions.length === 0) {
      console.log('No submissions found.');
      process.exit(0);
    }

    console.log('Recent submissions:\n');
    allSubmissions.slice(0, 10).forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.name}`);
      console.log(`   Type: ${sub.type}`);
      console.log(`   Address: ${sub.address}`);
      console.log(`   Submitted: ${new Date(sub.submittedAt).toLocaleString()}`);
      console.log('');
    });

    if (allSubmissions.length > 10) {
      console.log(`... and ${allSubmissions.length - 10} more submissions\n`);
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error checking submissions:', error.message);
    process.exit(1);
  }
}

checkSubmissions();



