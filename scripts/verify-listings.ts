import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../server/db";
import {
  fieldConfirmations,
  foodResources,
  userReports,
  verificationChecks,
  type FieldConfirmation,
  type FoodResource,
  type VerificationCheck,
} from "../shared/schema";
import { lookupPlace, type PlacesResult } from "./verification/places";
import { verifyListing, type AgentResult } from "./verification/agent";
import { decide, type Decision } from "./verification/policy";
import { selectListings, type Mode, type Selected } from "./verification/select";

/**
 * Listing verification agent (see docs/VERIFICATION_AGENT.md).
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/verify-listings.ts --mode=sweep            # every visible listing once
 *   npx tsx --env-file=.env scripts/verify-listings.ts --mode=weekly           # top 25 by change-risk
 *   npx tsx --env-file=.env scripts/verify-listings.ts --mode=daily            # reports + new listings
 *   npx tsx --env-file=.env scripts/verify-listings.ts --ids=<id>,<id>
 *   Add --dry-run to research and write a report without changing the database.
 *
 * Env: VERIFY_BATCH_SIZE (default 25), VERIFY_AUTO_APPROVE (default true)
 */

// Opus 5.5 list prices; web search is billed per search. Estimates only.
const PRICE_INPUT_PER_M = 4;
const PRICE_OUTPUT_PER_M = 20;
const PRICE_CACHE_READ_PER_M = 0.2;
const PRICE_PER_SEARCH = 0.01;
const CONCURRENCY = 3;

interface CheckResult {
  selected: Selected;
  places: PlacesResult;
  agent: AgentResult;
  decision: Decision | null;
  costUsd: number;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const mode = (get("mode") || "weekly") as Mode;
  if (!["sweep", "weekly", "daily"].includes(mode)) throw new Error(`Unknown --mode=${mode}`);
  return {
    dryRun: args.includes("--dry-run"),
    mode,
    limit: parseInt(get("limit") || process.env.VERIFY_BATCH_SIZE || (mode === "sweep" ? "1000" : "25"), 10),
    ids: get("ids")?.split(",").filter(Boolean),
    autoApprove: (process.env.VERIFY_AUTO_APPROVE ?? "true") !== "false",
  };
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

async function saveResult(result: CheckResult) {
  const { selected, places, agent, decision, costUsd } = result;
  const listing = selected.listing;
  const verdict = agent.verdict;
  const now = new Date();

  await db.transaction(async (tx: typeof db) => {
    // A new check replaces any older one still waiting for review
    await tx
      .update(verificationChecks)
      .set({ resolution: "superseded", resolvedAt: now })
      .where(and(eq(verificationChecks.resourceId, listing.id), eq(verificationChecks.resolution, "pending")));

    await tx.insert(verificationChecks).values({
      resourceId: listing.id,
      checkedAt: now,
      trigger: selected.trigger,
      status: verdict?.status ?? null,
      confidence: verdict?.confidence ?? null,
      summary: verdict?.summary ?? null,
      evidence: verdict?.evidence ?? null,
      proposedChanges: decision ? { ...decision.reviewableChanges } : null,
      conflicts: decision?.conflicts.length ? decision.conflicts : null,
      placesSnapshot: places,
      error: agent.error ?? null,
      resolution: !verdict ? "error" : decision!.resolution,
      resolvedAt: decision?.resolution === "auto_verified" ? now : null,
      resolutionNote: decision?.reason ?? null,
      model: agent.model,
      inputTokens: agent.usage.inputTokens + agent.usage.cacheReadTokens,
      outputTokens: agent.usage.outputTokens,
      webSearches: agent.usage.webSearches,
      costUsd: costUsd.toFixed(4),
    });

    const updates: Partial<FoodResource> = { lastAgentCheckAt: now };
    if (places.match?.placeId) updates.googlePlaceId = places.match.placeId;
    if (decision?.websiteFill) updates.website = decision.websiteFill;
    if (decision?.resolution === "auto_verified") {
      updates.lastVerifiedDate = now;
      updates.verificationSource = "agent";
      if (decision.clearReport) {
        updates.reportedClosed = false;
        updates.reportedClosedCount = "0";
        updates.reportedClosedAt = null;
      }
    }
    await tx.update(foodResources).set(updates).where(eq(foodResources.id, listing.id));
  });
}

function renderReport(mode: string, dryRun: boolean, results: CheckResult[]): string {
  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);
  const counts = new Map<string, number>();
  for (const r of results) {
    const key = r.decision?.resolution ?? "error";
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const lines = [
    `# Verification ${dryRun ? "dry run" : "run"} (${mode}) — ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`,
    "",
    `Listings checked: ${results.length} · Estimated cost: $${totalCost.toFixed(2)}`,
    "",
    ...Array.from(counts.entries()).map(([k, v]) => `- ${k}: ${v}`),
    "",
  ];

  for (const { selected, places, agent, decision, costUsd } of results) {
    const listing = selected.listing;
    lines.push("---", "", `## ${listing.name}`, "");
    lines.push(`**Type:** ${listing.type} · **Address:** ${listing.address} · **Trigger:** ${selected.trigger}`);
    lines.push(`**Listed hours:** ${listing.hours || "(none)"} · **Phone:** ${listing.phone || "(none)"}`);
    if (listing.reportedClosed) lines.push(`**⚠️ Reported closed by visitors** (${listing.reportedClosedCount}x)`);
    lines.push(
      `**Google:** ${places.match ? `${places.match.businessStatus} — ${places.match.name} (${places.match.distanceMeters} m away)` : places.error ? `lookup failed: ${places.error}` : "no match at this location"}`,
      "",
    );

    if (!agent.verdict) {
      lines.push(`**Result:** ❌ ${agent.error}`);
    } else {
      const v = agent.verdict;
      lines.push(`**Verdict:** \`${v.status}\` · confidence **${v.confidence}** → **${decision!.resolution}** (${decision!.reason})`, "", v.summary, "");
      const changes = Object.entries(decision!.reviewableChanges);
      if (changes.length > 0) {
        lines.push("**Changes to review:**");
        for (const [field, value] of changes) lines.push(`- ${field}: ${JSON.stringify(value)}`);
        lines.push("");
      }
      if (decision!.websiteFill) lines.push(`**Website added:** ${decision!.websiteFill}`, "");
      for (const c of decision!.conflicts) {
        lines.push(`**⚠️ Conflicts with ${c.source} confirmation (${c.confirmedAt.slice(0, 10)}):** ${c.field} confirmed as ${JSON.stringify(c.confirmedValue)}, agent proposes ${JSON.stringify(c.proposed)}`);
      }
      lines.push("**Evidence:**");
      for (const e of v.evidence) {
        lines.push(`- [${e.source_type}] ${e.finding}${e.observed_date ? ` _(dated ${e.observed_date})_` : ""} — ${e.url}`);
        if (e.quote) lines.push(`  > ${e.quote.replace(/\n/g, " ")}`);
      }
    }
    lines.push("", `_${agent.model} · ${agent.usage.webSearches} searches, ${agent.usage.webFetches} fetches · ~$${costUsd.toFixed(2)}_`, "");
  }
  return lines.join("\n");
}

async function main() {
  const { dryRun, mode, limit, ids, autoApprove } = parseArgs();
  if (!db) throw new Error("DATABASE_URL is not set");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");

  const all: FoodResource[] = await db.select().from(foodResources);
  const checks: VerificationCheck[] = await db.select().from(verificationChecks);

  const selected: Selected[] = ids
    ? all.filter((r) => ids.includes(r.id)).map((listing) => ({ listing, trigger: "sweep" as const }))
    : selectListings(mode, all, checks, { limit });

  if (selected.length === 0) {
    console.log("Nothing to check.");
    await pool?.end();
    return;
  }

  const selectedIds = selected.map((s) => s.listing.id);
  const reports = await db.select().from(userReports).where(inArray(userReports.resourceId, selectedIds));
  const confirmations: FieldConfirmation[] = await db
    .select()
    .from(fieldConfirmations)
    .where(inArray(fieldConfirmations.resourceId, selectedIds));

  console.log(
    `${dryRun ? "DRY RUN — " : ""}mode=${mode}: checking ${selected.length} listing(s), ${CONCURRENCY} at a time (auto-approve ${autoApprove ? "on" : "off"})...\n`,
  );

  const client = new Anthropic();
  let done = 0;
  const results = await runWithConcurrency(selected, CONCURRENCY, async (item): Promise<CheckResult> => {
    const listing = item.listing;
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

    const decision = agent.verdict
      ? decide(
          agent.verdict,
          listing,
          places,
          confirmations.filter((c) => c.resourceId === listing.id),
          { autoApprove },
        )
      : null;
    const costUsd = estimateCost(agent.usage);
    const result: CheckResult = { selected: item, places, agent, decision, costUsd };

    if (!dryRun) {
      try {
        await saveResult(result);
      } catch (error) {
        console.error(`  failed to save ${listing.name}:`, error);
      }
    }

    done++;
    console.log(
      `[${done}/${selected.length}] ${listing.name}: ${agent.verdict ? `${agent.verdict.status} (${agent.verdict.confidence}) → ${decision!.resolution}` : `ERROR ${agent.error}`} · ~$${costUsd.toFixed(2)}`,
    );
    return result;
  });

  const outDir = path.resolve("verification-runs");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const reportPath = path.join(outDir, `${dryRun ? "dry-run" : "run"}-${mode}-${stamp}.md`);
  fs.writeFileSync(reportPath, renderReport(mode, dryRun, results));

  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);
  const autoVerified = results.filter((r) => r.decision?.resolution === "auto_verified").length;
  const errors = results.filter((r) => !r.agent.verdict).length;
  console.log(`\nReport: ${reportPath}`);
  console.log(`Auto-verified: ${autoVerified} · To review: ${results.length - autoVerified - errors} · Errors: ${errors}`);
  console.log(`Estimated cost: $${totalCost.toFixed(2)}`);
  await pool?.end();
}

main().catch(async (error) => {
  console.error("Verification run failed:", error);
  await pool?.end();
  process.exit(1);
});
