import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { and, eq, inArray } from "drizzle-orm";
import { db, pool } from "../server/db";
import { geocode } from "../server/verification";
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
import { verifyListing, type AgentResult, type Verdict } from "./verification/agent";
import { decide } from "./verification/policy";
import { selectListings, type Mode, type Selected } from "./verification/select";
import { runTwoKey, type TwoKeyOutcome } from "./verification/twoKey";

/**
 * Listing verification agent (see docs/VERIFICATION_AGENT.md).
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/verify-listings.ts --mode=sweep     # every visible listing once
 *   npx tsx --env-file=.env scripts/verify-listings.ts --mode=weekly    # top 25 by change-risk
 *   npx tsx --env-file=.env scripts/verify-listings.ts --mode=daily     # reports + new listings
 *   npx tsx --env-file=.env scripts/verify-listings.ts --mode=pending   # re-run two-key approval on the review queue (no new research)
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
const DAY = 24 * 60 * 60 * 1000;

type RunMode = Mode | "pending";

interface CheckResult {
  listing: FoodResource;
  trigger: string;
  places: PlacesResult;
  verdict: Verdict | null;
  error?: string;
  model: string;
  usage: AgentResult["usage"];
  websiteFill: string | null;
  conflicts: unknown[];
  outcome: TwoKeyOutcome | null;
  costUsd: number;
  // Set when re-running an existing pending check
  existingCheckId?: string;
}

const COLUMN_FOR_FIELD: Record<string, keyof FoodResource> = {
  hours: "hours",
  phone: "phone",
  address: "address",
  website: "website",
  appointment_required: "appointmentRequired",
  notes: "notes",
};

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
  const mode = (get("mode") || "weekly") as RunMode;
  if (!["sweep", "weekly", "daily", "pending"].includes(mode)) throw new Error(`Unknown --mode=${mode}`);
  return {
    dryRun: args.includes("--dry-run"),
    mode,
    limit: parseInt(get("limit") || process.env.VERIFY_BATCH_SIZE || (mode === "weekly" || mode === "daily" ? "25" : "1000"), 10),
    ids: get("ids")?.split(",").filter(Boolean),
    autoApprove: (process.env.VERIFY_AUTO_APPROVE ?? "true") !== "false",
  };
}

function estimateCost(usage: AgentResult["usage"], checkerUsage?: { inputTokens: number; outputTokens: number }): number {
  return (
    ((usage.inputTokens + (checkerUsage?.inputTokens ?? 0)) / 1e6) * PRICE_INPUT_PER_M +
    ((usage.outputTokens + (checkerUsage?.outputTokens ?? 0)) / 1e6) * PRICE_OUTPUT_PER_M +
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

function hasFreshEvidence(outcome: TwoKeyOutcome | null, verdict: Verdict | null, now: Date): boolean {
  const dates = (outcome?.evidence.length ? outcome.evidence.filter((e) => e.quoteVerified) : verdict?.evidence ?? []).map(
    (e) => e.observed_date,
  );
  return dates.some((d) => d && now.getTime() - Date.parse(d) <= 30 * DAY);
}

async function saveResult(result: CheckResult) {
  const { listing, places, verdict, outcome, costUsd } = result;
  const now = new Date();

  const updates: Partial<FoodResource> = { lastAgentCheckAt: now };
  const applied: Record<string, { before: unknown; after: unknown }> = {};
  let resolution: string = verdict ? outcome!.resolution : "error";
  let remaining = { ...(outcome?.remaining ?? {}) };
  let reason = outcome?.reason ?? result.error ?? null;

  if (places.match?.placeId) updates.googlePlaceId = places.match.placeId;
  if (result.websiteFill) {
    updates.website = result.websiteFill;
    applied.website = { before: listing.website ?? null, after: result.websiteFill };
  }

  if (outcome) {
    for (const [field, value] of Object.entries(outcome.apply)) {
      const column = COLUMN_FOR_FIELD[field];
      if (!column) continue;
      if (field === "address") {
        const coords = await geocode(String(value));
        if (!coords) {
          remaining.address = value;
          resolution = "pending";
          reason = "couldn't find map coordinates for the new address";
          continue;
        }
        updates.latitude = coords.lat;
        updates.longitude = coords.lng;
        applied.latitude = { before: listing.latitude, after: coords.lat };
        applied.longitude = { before: listing.longitude, after: coords.lng };
      }
      const after = field === "appointment_required" ? Boolean(value) : value;
      (updates as Record<string, unknown>)[column] = after;
      applied[field] = { before: listing[column] ?? null, after };
    }

    if (outcome.hideReason) {
      updates.hidden = true;
      updates.hiddenReason = outcome.hideReason;
      applied.hidden = { before: listing.hidden ?? false, after: true };
      applied.hidden_reason = { before: listing.hiddenReason ?? null, after: outcome.hideReason };
    }
    if (outcome.unhide) {
      updates.hidden = false;
      updates.hiddenReason = null;
      applied.hidden = { before: true, after: false };
    }
    if (outcome.markVerified && resolution !== "pending") {
      updates.lastVerifiedDate = now;
      updates.verificationSource = "agent";
      if (listing.reportedClosed && hasFreshEvidence(outcome, verdict, now)) {
        updates.reportedClosed = false;
        updates.reportedClosedCount = "0";
        updates.reportedClosedAt = null;
      }
    }
  }

  const resolved = resolution !== "pending" && resolution !== "error";
  const checkFields = {
    proposedChanges: Object.keys(remaining).length ? remaining : null,
    appliedChanges: Object.keys(applied).length ? applied : null,
    resolution,
    resolvedAt: resolved ? now : null,
    resolutionNote: reason,
  };

  await db.transaction(async (tx: typeof db) => {
    if (result.existingCheckId) {
      await tx
        .update(verificationChecks)
        .set({ ...checkFields, costUsd: undefined })
        .where(and(eq(verificationChecks.id, result.existingCheckId), eq(verificationChecks.resolution, "pending")));
    } else {
      // A new check replaces any older one still waiting for review
      await tx
        .update(verificationChecks)
        .set({ resolution: "superseded", resolvedAt: now })
        .where(and(eq(verificationChecks.resourceId, listing.id), eq(verificationChecks.resolution, "pending")));
      await tx.insert(verificationChecks).values({
        resourceId: listing.id,
        checkedAt: now,
        trigger: result.trigger,
        status: verdict?.status ?? null,
        confidence: verdict?.confidence ?? null,
        summary: verdict?.summary ?? null,
        evidence: verdict?.evidence ?? null,
        conflicts: result.conflicts.length ? result.conflicts : null,
        placesSnapshot: places,
        error: result.error ?? null,
        model: result.model,
        inputTokens: result.usage.inputTokens + result.usage.cacheReadTokens,
        outputTokens: result.usage.outputTokens,
        webSearches: result.usage.webSearches,
        costUsd: costUsd.toFixed(4),
        ...checkFields,
      });
    }
    await tx.update(foodResources).set(updates).where(eq(foodResources.id, listing.id));
  });
}

function renderReport(mode: string, dryRun: boolean, results: CheckResult[]): string {
  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);
  const counts = new Map<string, number>();
  for (const r of results) {
    const key = r.outcome?.resolution ?? "error";
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

  for (const r of results) {
    const { listing, places, verdict, outcome } = r;
    lines.push("---", "", `## ${listing.name}`, "");
    lines.push(`**Type:** ${listing.type} · **Address:** ${listing.address} · **Trigger:** ${r.trigger}`);
    lines.push(
      `**Google:** ${places.match ? `${places.match.businessStatus} — ${places.match.name} (${places.match.distanceMeters} m away)` : places.error ? `lookup failed: ${places.error}` : "no match at this location"}`,
      "",
    );
    if (!verdict || !outcome) {
      lines.push(`**Result:** ❌ ${r.error}`, "");
      continue;
    }
    lines.push(`**Verdict:** \`${verdict.status}\` · ${verdict.confidence} → **${outcome.resolution}** (${outcome.reason})`, "", verdict.summary, "");
    if (Object.keys(outcome.apply).length) lines.push(`**Applied:** ${JSON.stringify(outcome.apply)}`, "");
    if (outcome.hideReason) lines.push(`**Hidden:** ${outcome.hideReason}`, "");
    if (Object.keys(outcome.remaining).length) lines.push(`**Still to review:** ${JSON.stringify(outcome.remaining)}`, "");
    if (outcome.evidence.length) {
      lines.push("**Quote check:**");
      for (const e of outcome.evidence) lines.push(`- ${e.quoteVerified ? "✅" : "❌"} [${e.source_type}] ${e.url}`);
      lines.push("");
    }
    if (outcome.checker) lines.push(`**Second check:** ${outcome.checker.status} — ${outcome.checker.reason}`, "");
    lines.push(`_~$${r.costUsd.toFixed(2)}_`, "");
  }
  return lines.join("\n");
}

const EMPTY_USAGE = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, webSearches: 0, webFetches: 0 };

async function main() {
  const { dryRun, mode, limit, ids, autoApprove } = parseArgs();
  if (!db) throw new Error("DATABASE_URL is not set");
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");

  const all: FoodResource[] = await db.select().from(foodResources);
  const checks: VerificationCheck[] = await db.select().from(verificationChecks);
  const byId = new Map(all.map((r) => [r.id, r]));

  // Work items: either fresh research, or a pending check to re-run through two-key approval
  type Item = { listing: FoodResource; trigger: string; existing?: VerificationCheck };
  let items: Item[];
  if (mode === "pending") {
    items = checks
      .filter((c) => c.resolution === "pending" && byId.has(c.resourceId))
      .slice(0, limit)
      .map((c) => ({ listing: byId.get(c.resourceId)!, trigger: c.trigger, existing: c }));
  } else if (ids) {
    items = all.filter((r) => ids.includes(r.id)).map((listing) => ({ listing, trigger: "manual" }));
  } else {
    items = selectListings(mode, all, checks, { limit }).map((s: Selected) => ({ listing: s.listing, trigger: s.trigger }));
  }

  if (items.length === 0) {
    console.log("Nothing to check.");
    await pool?.end();
    return;
  }

  const selectedIds = items.map((i) => i.listing.id);
  const reports = await db.select().from(userReports).where(inArray(userReports.resourceId, selectedIds));
  const confirmations: FieldConfirmation[] = await db
    .select()
    .from(fieldConfirmations)
    .where(inArray(fieldConfirmations.resourceId, selectedIds));

  console.log(
    `${dryRun ? "DRY RUN — " : ""}mode=${mode}: ${items.length} listing(s), ${CONCURRENCY} at a time (auto-approve ${autoApprove ? "on" : "off"})...\n`,
  );

  const client = new Anthropic();
  let done = 0;
  const results = await runWithConcurrency(items, CONCURRENCY, async (item): Promise<CheckResult> => {
    const listing = item.listing;
    let places: PlacesResult;
    let agent: AgentResult;

    if (item.existing) {
      // Re-use the research already done; only the approval step runs again
      const c = item.existing;
      places = (c.placesSnapshot as PlacesResult) ?? { match: null, candidates: [] };
      agent = {
        verdict: {
          status: c.status as Verdict["status"],
          confidence: c.confidence as Verdict["confidence"],
          summary: c.summary ?? "",
          evidence: (c.evidence as Verdict["evidence"]) ?? [],
          proposed_changes: {
            hours: null, phone: null, address: null, website: null, appointment_required: null, notes: null,
            ...((c.proposedChanges as Partial<Verdict["proposed_changes"]>) ?? {}),
          },
        },
        usage: EMPTY_USAGE,
        model: c.model ?? "",
      };
    } else {
      places = await lookupPlace(listing);
      const reportDetails = reports
        .filter((r: { resourceId: string; reportDetails: string | null }) => r.resourceId === listing.id && r.reportDetails)
        .map((r: { reportDetails: string | null }) => r.reportDetails as string);
      try {
        agent = await verifyListing(client, listing, places, reportDetails);
      } catch (error) {
        const message = error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : String(error);
        agent = { verdict: null, error: message, usage: EMPTY_USAGE, model: "" };
      }
    }

    let outcome: TwoKeyOutcome | null = null;
    let websiteFill: string | null = null;
    let conflicts: unknown[] = [];
    if (agent.verdict) {
      const decision = decide(
        agent.verdict,
        listing,
        places,
        confirmations.filter((c) => c.resourceId === listing.id),
        { autoApprove },
      );
      websiteFill = decision.websiteFill;
      conflicts = decision.conflicts;
      try {
        outcome = await runTwoKey(client, listing, agent.verdict, decision, places, { autoApprove });
      } catch (error) {
        outcome = {
          resolution: "pending",
          apply: {},
          remaining: { ...decision.reviewableChanges },
          hideReason: null,
          unhide: false,
          markVerified: false,
          reason: `two-key check failed: ${error instanceof Error ? error.message : String(error)}`,
          evidence: [],
          checker: null,
        };
      }
    }

    const result: CheckResult = {
      listing,
      trigger: item.trigger,
      places,
      verdict: agent.verdict,
      error: agent.error,
      model: agent.model,
      usage: agent.usage,
      websiteFill,
      conflicts,
      outcome,
      costUsd: estimateCost(agent.usage, outcome?.checker?.usage),
      existingCheckId: item.existing?.id,
    };

    if (!dryRun) {
      try {
        await saveResult(result);
      } catch (error) {
        console.error(`  failed to save ${listing.name}:`, error);
      }
    }

    done++;
    console.log(
      `[${done}/${items.length}] ${listing.name}: ${agent.verdict ? `${agent.verdict.status} (${agent.verdict.confidence}) → ${outcome!.resolution}` : `ERROR ${agent.error}`} · ~$${result.costUsd.toFixed(2)}`,
    );
    return result;
  });

  const outDir = path.resolve("verification-runs");
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const reportPath = path.join(outDir, `${dryRun ? "dry-run" : "run"}-${mode}-${stamp}.md`);
  fs.writeFileSync(reportPath, renderReport(mode, dryRun, results));

  const tally = (r: string) => results.filter((x) => x.outcome?.resolution === r).length;
  console.log(`\nReport: ${reportPath}`);
  console.log(
    `Verified: ${tally("auto_verified")} · Updated: ${tally("auto_applied")} · Hidden: ${tally("auto_hidden")} · Unconfirmed: ${tally("unconfirmed")} · To review: ${tally("pending")} · Errors: ${results.filter((x) => !x.verdict).length}`,
  );
  console.log(`Estimated cost: $${results.reduce((sum, r) => sum + r.costUsd, 0).toFixed(2)}`);
  await pool?.end();
}

main().catch(async (error) => {
  console.error("Verification run failed:", error);
  await pool?.end();
  process.exit(1);
});
