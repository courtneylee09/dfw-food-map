import { db } from "../server/db";
import { foodResources, userReports } from "../shared/schema";
import { eq } from "drizzle-orm";

async function testReporting() {
  console.log("\n🧪 Testing Verification System\n");
  console.log("=".repeat(80));

  if (!db) {
    throw new Error("Database not configured");
  }

  // Get first location
  const resources = await db.select().from(foodResources).limit(1);
  
  if (resources.length === 0) {
    console.log("❌ No resources in database. Please import some data first.");
    return;
  }

  const testResource = resources[0];
  console.log(`\n✅ Found test location:`);
  console.log(`   Name: ${testResource.name}`);
  console.log(`   ID: ${testResource.id}`);
  console.log(`   Address: ${testResource.address}`);
  console.log(`   Last Verified: ${testResource.lastVerifiedDate}`);
  console.log(`   Reported Closed: ${testResource.reportedClosed}`);
  console.log(`   Report Count: ${testResource.reportedClosedCount}`);

  console.log(`\n📝 Creating test report...`);

  // Create a test report
  const [report] = await db.insert(userReports).values({
    resourceId: testResource.id,
    reportType: 'closed',
    reportDetails: 'Test report - location appears to be closed',
    userIp: '127.0.0.1',
  }).returning();

  console.log(`✅ Report created with ID: ${report.id}`);

  // Update resource as reported closed
  await db.update(foodResources)
    .set({
      reportedClosed: true,
      reportedClosedCount: '1',
      reportedClosedAt: new Date(),
    })
    .where(eq(foodResources.id, testResource.id));

  console.log(`✅ Resource flagged as reported closed`);

  // Verify the update
  const [updated] = await db.select()
    .from(foodResources)
    .where(eq(foodResources.id, testResource.id));

  console.log(`\n📊 Updated resource status:`);
  console.log(`   Reported Closed: ${updated.reportedClosed}`);
  console.log(`   Report Count: ${updated.reportedClosedCount}`);
  console.log(`   Reported At: ${updated.reportedClosedAt}`);

  console.log(`\n✨ Test complete!`);
  console.log(`\nℹ️  Next steps:`);
  console.log(`   1. Visit http://localhost:5000/verification-review`);
  console.log(`   2. You should see "${testResource.name}" flagged for review`);
  console.log(`   3. Click "Mark Verified" or "Remove" to test admin actions`);
  console.log(`   4. Run "npm run verify:weekly" to see it in the report`);
  console.log("=".repeat(80) + "\n");

  process.exit(0);
}

testReporting().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
