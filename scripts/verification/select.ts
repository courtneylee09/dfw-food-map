import type { FoodResource, VerificationCheck } from "../../shared/schema";

// Chooses which listings each run checks (docs/VERIFICATION_AGENT.md → Pace / Batch selection).

export type Mode = "sweep" | "weekly" | "daily";

export interface Selected {
  listing: FoodResource;
  trigger: "sweep" | "scheduled" | "user_report" | "new_listing";
  score?: number;
}

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const MANUAL_SKIP_DAYS = 60;
const VOLATILE_TYPES = new Set(["Grocery Distribution", "Hot Meal", "Community Fridge"]);
const MANUAL_SOURCES = new Set(["manual", "manual_review", "admin_review"]);

function isRecentlyManualVerified(listing: FoodResource, now: Date): boolean {
  return (
    MANUAL_SOURCES.has(listing.verificationSource ?? "") &&
    !!listing.lastVerifiedDate &&
    now.getTime() - new Date(listing.lastVerifiedDate).getTime() <= MANUAL_SKIP_DAYS * DAY
  );
}

function needsReportCheck(listing: FoodResource): boolean {
  if (!listing.reportedClosed) return false;
  if (!listing.lastAgentCheckAt) return true;
  return !!listing.reportedClosedAt && new Date(listing.reportedClosedAt) > new Date(listing.lastAgentCheckAt);
}

// Change-risk score: higher means more likely to have changed since it was last confirmed
export function riskScore(listing: FoodResource, lastCheck: VerificationCheck | undefined, now: Date): number {
  let score = 0;
  const lastVerified = listing.lastVerifiedDate ? new Date(listing.lastVerifiedDate).getTime() : 0;
  score += Math.min(26, Math.floor((now.getTime() - lastVerified) / WEEK));

  if (lastCheck && !(lastCheck.status === "active" && lastCheck.confidence === "high")) score += 8;

  const placesStatus = (lastCheck?.placesSnapshot as { match?: { businessStatus?: string } | null } | null)?.match
    ?.businessStatus;
  if (lastCheck && placesStatus !== "OPERATIONAL") score += 8;

  if (VOLATILE_TYPES.has(listing.type)) score += 5;

  // CACFP suppers follow the school calendar
  const month = now.getMonth() + 1;
  if (listing.type === "Youth Supper (CACFP)" && [1, 5, 6, 8, 12].includes(month)) score += 5;

  return score;
}

export function selectListings(
  mode: Mode,
  listings: FoodResource[],
  checks: VerificationCheck[],
  options: { limit: number; now?: Date },
): Selected[] {
  const now = options.now ?? new Date();
  const visible = listings.filter((l) => !l.hidden);
  const pendingIds = new Set(checks.filter((c) => c.resolution === "pending").map((c) => c.resourceId));

  const latestCheck = new Map<string, VerificationCheck>();
  for (const check of checks) {
    const existing = latestCheck.get(check.resourceId);
    if (!existing || new Date(check.checkedAt!) > new Date(existing.checkedAt!)) latestCheck.set(check.resourceId, check);
  }

  // Reports and never-checked listings jump the line in every mode
  const urgent: Selected[] = [
    ...visible.filter(needsReportCheck).map((listing) => ({ listing, trigger: "user_report" as const })),
    ...visible
      .filter((l) => !l.lastAgentCheckAt && !needsReportCheck(l) && mode !== "sweep")
      .map((listing) => ({ listing, trigger: "new_listing" as const })),
  ];

  if (mode === "daily") return urgent;

  if (mode === "sweep") {
    const urgentIds = new Set(urgent.map((s) => s.listing.id));
    return [
      ...urgent,
      ...visible.filter((l) => !urgentIds.has(l.id)).map((listing) => ({ listing, trigger: "sweep" as const })),
    ].slice(0, options.limit);
  }

  // weekly: urgent first, then highest change-risk
  const urgentIds = new Set(urgent.map((s) => s.listing.id));
  const scored = visible
    .filter((l) => !urgentIds.has(l.id) && !pendingIds.has(l.id) && !isRecentlyManualVerified(l, now))
    .map((listing) => ({ listing, trigger: "scheduled" as const, score: riskScore(listing, latestCheck.get(listing.id), now) }))
    .sort((a, b) => b.score - a.score);

  return [...urgent, ...scored].slice(0, Math.max(options.limit, urgent.length));
}
