import { db } from "../server/db";
import { foodResources, type FoodResource } from "../shared/schema";
import { lt, or, eq } from "drizzle-orm";

/**
 * Weekly Verification Script
 * 
 * This script should be run weekly (via cron job) to:
 * 1. Identify locations that haven't been verified in 60+ days
 * 2. Generate a report of locations needing manual review
 * 3. Optionally send notifications to admins
 * 
 * Usage:
 *   npx tsx scripts/weekly-verification.ts
 *   npx tsx scripts/weekly-verification.ts --days 90
 */

interface VerificationReport {
  needsVerification: number;
  reportedClosed: number;
  totalResources: number;
  locations: Array<{
    id: string;
    name: string;
    address: string;
    lastVerifiedDate: Date | null;
    reportedClosed: boolean;
    reportedClosedCount: string;
    daysSinceVerification: number;
  }>;
}

async function runWeeklyVerification(daysThreshold: number = 60): Promise<VerificationReport> {
  console.log(`\n🔍 Running Weekly Verification Check (${daysThreshold} days threshold)\n`);

  if (!db) {
    throw new Error("Database not configured. Please set DATABASE_URL environment variable.");
  }

  // Get all resources
  const allResources = await db.select().from(foodResources);
  console.log(`📊 Total resources in database: ${allResources.length}`);

  // Calculate cutoff date
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);
  console.log(`📅 Checking for resources not verified since: ${cutoffDate.toLocaleDateString()}`);

  // Get resources needing verification
  const needsVerification = await db
    .select()
    .from(foodResources)
    .where(
      or(
        lt(foodResources.lastVerifiedDate, cutoffDate),
        eq(foodResources.reportedClosed, true)
      )
    );

  // Count reported closed locations
  const reportedClosed = needsVerification.filter((r: FoodResource) => r.reportedClosed);

  // Build detailed report
  const now = new Date();
  const locationsData = needsVerification.map((resource: FoodResource) => {
    const lastVerified = resource.lastVerifiedDate ? new Date(resource.lastVerifiedDate) : null;
    const daysSince = lastVerified 
      ? Math.floor((now.getTime() - lastVerified.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    return {
      id: resource.id,
      name: resource.name,
      address: resource.address,
      lastVerifiedDate: lastVerified,
      reportedClosed: resource.reportedClosed || false,
      reportedClosedCount: resource.reportedClosedCount || "0",
      daysSinceVerification: daysSince,
    };
  });

  // Sort by most urgent (reported closed first, then oldest verification)
  locationsData.sort((a: typeof locationsData[0], b: typeof locationsData[0]) => {
    if (a.reportedClosed && !b.reportedClosed) return -1;
    if (!a.reportedClosed && b.reportedClosed) return 1;
    return b.daysSinceVerification - a.daysSinceVerification;
  });

  return {
    needsVerification: needsVerification.length,
    reportedClosed: reportedClosed.length,
    totalResources: allResources.length,
    locations: locationsData,
  };
}

function printReport(report: VerificationReport) {
  console.log("\n" + "=".repeat(80));
  console.log("📋 WEEKLY VERIFICATION REPORT");
  console.log("=".repeat(80));
  console.log(`\n📊 Summary:`);
  console.log(`   Total Resources: ${report.totalResources}`);
  console.log(`   ⚠️  Needs Verification: ${report.needsVerification}`);
  console.log(`   🚫 Reported Closed: ${report.reportedClosed}`);
  console.log(`   ✅ Up to Date: ${report.totalResources - report.needsVerification}`);

  if (report.needsVerification === 0) {
    console.log("\n✨ All locations are up to date! No action needed.");
  } else {
    console.log(`\n⚠️  LOCATIONS NEEDING REVIEW (${report.needsVerification}):`);
    console.log("=".repeat(80));

    report.locations.forEach((location, index) => {
      console.log(`\n${index + 1}. ${location.name}`);
      console.log(`   Address: ${location.address}`);
      console.log(`   Last Verified: ${location.lastVerifiedDate?.toLocaleDateString() || "Never"}`);
      console.log(`   Days Since Verification: ${location.daysSinceVerification}`);
      
      if (location.reportedClosed) {
        console.log(`   🚫 REPORTED CLOSED - ${location.reportedClosedCount} report(s)`);
      }
    });

    console.log("\n" + "=".repeat(80));
    console.log("📝 ACTION ITEMS:");
    console.log("=".repeat(80));
    console.log("1. Review flagged locations at: /verification-review");
    console.log("2. Call or visit locations to verify they're still operational");
    console.log("3. Mark as verified or remove from database");
    console.log("4. Consider automated verification via Google Places API for high-priority locations");
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

// Export CSV function for easy import into spreadsheets
function exportToCSV(report: VerificationReport): string {
  const headers = "Name,Address,Last Verified,Days Since Verification,Reported Closed,Report Count";
  const rows = report.locations.map(loc => 
    `"${loc.name}","${loc.address}","${loc.lastVerifiedDate?.toLocaleDateString() || 'Never'}",${loc.daysSinceVerification},${loc.reportedClosed},${loc.reportedClosedCount}`
  );
  return [headers, ...rows].join('\n');
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    const daysArg = args.find(arg => arg.startsWith('--days='));
    const days = daysArg ? parseInt(daysArg.split('=')[1]) : 60;

    const report = await runWeeklyVerification(days);
    printReport(report);

    // Optionally export to CSV
    if (args.includes('--csv')) {
      const csv = exportToCSV(report);
      const fs = await import('fs');
      const filename = `verification-report-${new Date().toISOString().split('T')[0]}.csv`;
      fs.writeFileSync(filename, csv);
      console.log(`📄 CSV report exported to: ${filename}\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error running verification check:", error);
    process.exit(1);
  }
}

main();
