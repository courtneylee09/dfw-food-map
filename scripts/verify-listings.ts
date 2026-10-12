import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { inArray } from "drizzle-orm";
import { db, pool } from "../server/db";
import { foodResources, userReports, type FoodResource } from "../shared/schema";
import { lookupPlace } from "./verification/places";
import { verifyListing, type AgentResult } from "./verification/agent";

/**
 * Listing verification agent (see docs/VERIFICATION_AGENT.md).
 *
 * Phase 0 — dry run: researches listings and writes a report. Makes no
 * database changes.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/verify-listings.ts --dry-run
 *   npx tsx --env-file=.env scripts/verify-listings.ts --dry-run --limit=10
 *   npx tsx --env-file=.env scripts/verify-listings.ts --dry-run --ids=<id>,<id>
 */

// Opus 5.5 list prices; web search is billed per search. Estimates only.
const PRICE_INPUT_PER_M = 4;
const PRICE_OUTPUT_PER_M = 20;
const PRICE_CACHE_READ_PER_M = 0.2;
const PRICE_PER_SEARCH = 0.01;
const CONCURRENCY = 3;

interface CheckResult {
  listing: FoodResource;
  places: Awaited<ReturnType<typeof lookupPlace>>;
  agent: AgentResult;
  costUsd: number;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  return {
    dryRun: args.includes("--dry-run"),
    limit: parseInt(get("limit") || "10", 10),
    ids: get("ids")?.split(",").filter(Boolean),
  };
}

// Dry-run sample: every reported-closed listing, then a spread across types
function pickSample(all: FoodResource[], limit: number): FoodResource[] {
  const picked: FoodResource[] = all.filter((r) => r.reportedClosed).slice(0, limit);
  const byType = new Map<string, FoodResource[]>();
  for (const r of all) {
    if (picked.includes(r)) continue;
    byType.set(r.type, [...(byType.get(r.type) || []), r]);
  }
  const queues = Array.from(byType.values());
  while (picked.length < limit && queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && picked.length < limit) picked.push(next);
    }
  }
  return picked;
}

function estimateCost(usage: AgentResult["usage"]): number {
  return (
    (usage.inputTokens / 1e6) * PRICE_INPUT_PER_M +
    (usage.outputTokens / 1e6) * PRICE_OUTPUT_PER_M +
    (usage.cacheReadTokens / 1e6) * PRICE_CACHE_READ_PER_M +
    usage.webSearches * PRICE_PER_SEARCH
  );
}

async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

function renderReport(results: CheckResult[]): string {
  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);
  const counts = new Map<string, number>();
  for (const r of results) {
    const key = r.agent.verdict ? `${r.agent.verdict.status} (${r.agent.verdict.confidence})` : "error";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const lines = [
    `# Verification dry run — ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
    "",
    `Listings checked: ${results.length} · Estimated cost: $${totalCost.toFixed(2)} (avg $${(totalCost / Math.max(results.length, 1)).toFixed(2)})`,
    "",
    ...Array.from(counts.entries()).map(([k, v]) => `- ${k}: ${v}`),
    "",
  ];

  for (const { listing, places, agent, costUsd } of results) {
    lines.push("---", "", `## ${listing.name}`, "");
    lines.push(`**Type:** ${listing.type} · **Address:** ${listing.address}`);
    lines.push(`**Listed hours:** ${listing.hours || "(none)"} · **Phone:** ${listing.phone || "(none)"}`);
    if (listing.reportedClosed) lines.push(`**⚠️ Reported closed by visitors** (${listing.reportedClosedCount}x)`);
    lines.push(
      `**Google:** ${places.match ? `${places.match.businessStatus} — ${places.match.name} (${places.match.distanceMeters} m away)` : places.error ? `lookup failed: ${places.error}` : "no match at this location"}`,
    );
    lines.push("");

    if (!agent.verdict) {
      lines.push(`**Result:** ❌ ${agent.error}`);
    } else {
      const v = agent.verdict;
      lines.push(`**Verdict:** \`${v.status}\` · confidence **${v.confidence}**`, "", v.summary, "");
      const changes = Object.entries(v.proposed_changes).filter(([, value]) => value !== null);
      if (changes.length > 0) {
        lines.push("**Proposed changes:**");
        for (const [field, value] of changes) lines.push(`- ${field}: ${JSON.stringify(value)}`);
        lines.push("");
      }
      lines.push("**Evidence:**");
      for (const e of v.evidence) {
        lines.push(`- [${e.source_type}] ${e.finding}${e.observed_date ? ` _(dated ${e.observed_date})_` : ""} — ${e.url}`);
      }
    }
    lines.push(
      "",
      `_${agent.model} · ${agent.usage.webSearches} searches, ${agent.usage.webFetches} fetches · ${agent.usage.inputTokens + agent.usage.cacheReadTokens} in / ${agent.usage.outputTokens} out tokens · ~$${costUsd.toFixed(2)}_`,
      "",
    );
  }
  return lines.join("\n");
}

async function main() {
  const { dryRun, limit, ids } = parseArgs();
  if (!dryRun) {
    console.error("Only --dry-run is implemented so far (Phase 0). No database changes will be made.");
    process.exit(1);
  }
  if (!db) throw new Error("DATABASE_URL is not set");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");

  const all: FoodResource[] = await db.select().from(foodResources);
  const listings = ids ? all.filter((r) => ids.includes(r.id)) : pickSample(all, limit);
  const reports = listings.length
    ? await db.select().from(userReports).where(inArray(userReports.resourceId, listings.map((l) => l.id)))
    : [];

  console.log(`Dry run: checking ${listings.length} listing(s), ${CONCURRENCY} at a time...\n`);

  const client = new Anthropic();
  let done = 0;
  const results = await runWithConcurrency(listings, CONCURRENCY, async (listing): Promise<CheckResult> => {
    const places = await lookupPlace(listing);
    const reportDetails = reports
      .filter((r: { resourceId: string; reportDetails: string | null }) => r.resourceId === listing.id && r.reportDetails)
      .map((r: { reportDetails: string | null }) => r.reportDetails as string);

    let agent: AgentResult;
    try {
      agent = await verifyListing(client, listing, places, reportDetails);
    } catch (error) {
      const message = error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : String(error);
      agent = {
        verdict: null,
        error: message,
        usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, webSearches: 0, webFetches: 0 },
        model: "",
      };
    }
    const costUsd = estimateCost(agent.usage);
    done++;
    console.log(
      `[${done}/${listings.length}] ${listing.name}: ${agent.verdict ? `${agent.verdict.status} (${agent.verdict.confidence})` : `ERROR ${agent.error}`} · ~$${costUsd.toFixed(2)}`,
    );
    return { listing, places, agent, costUsd };
  });

  const outDir = path.resolve("verification-runs");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const reportPath = path.join(outDir, `dry-run-${stamp}.md`);
  fs.writeFileSync(reportPath, renderReport(results));
  fs.writeFileSync(path.join(outDir, `dry-run-${stamp}.json`), JSON.stringify(results, null, 2));

  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);
  console.log(`\nReport: ${reportPath}`);
  console.log(`Estimated cost: $${totalCost.toFixed(2)}`);
  await pool?.end();
}

main().catch(async (error) => {
  console.error("Verification run failed:", error);
  await pool?.end();
  process.exit(1);
});
