import type { FieldConfirmation, FoodResource } from "../../shared/schema";
import type { PlacesResult } from "./places";
import type { Verdict } from "./agent";

// Decides what happens to a verdict (docs/VERIFICATION_AGENT.md → Decision policy).
// The only automatic actions are: mark verified, and fill in a website the listing doesn't have.

const DAY = 24 * 60 * 60 * 1000;
export const PRIMARY_SOURCE_PROTECTION_DAYS = 180;

type ChangeField = keyof Verdict["proposed_changes"];

export interface Decision {
  resolution: "auto_verified" | "pending";
  // Changes a human must approve
  reviewableChanges: Partial<Verdict["proposed_changes"]>;
  // Website for a listing that has none — filled in automatically
  websiteFill: string | null;
  // Proposed changes that contradict a recent primary-source confirmation
  conflicts: Array<{ field: string; confirmedValue: string | null; confirmedAt: string; source: string; proposed: unknown }>;
  clearReport: boolean;
  reason: string;
}

function currentValue(listing: FoodResource, field: ChangeField): unknown {
  switch (field) {
    case "appointment_required":
      return listing.appointmentRequired ?? false;
    default:
      return listing[field] ?? null;
  }
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function hasDatedEvidenceWithin(verdict: Verdict, days: number, now: Date): boolean {
  return verdict.evidence.some((e) => {
    if (!e.observed_date) return false;
    const t = Date.parse(e.observed_date);
    return Number.isFinite(t) && now.getTime() - t <= days * DAY && t <= now.getTime() + DAY;
  });
}

export function decide(
  verdict: Verdict,
  listing: FoodResource,
  places: PlacesResult,
  confirmations: FieldConfirmation[],
  options: { autoApprove: boolean; now?: Date },
): Decision {
  const now = options.now ?? new Date();
  const recentConfirmations = confirmations.filter(
    (c) => c.confirmedAt && now.getTime() - new Date(c.confirmedAt).getTime() <= PRIMARY_SOURCE_PROTECTION_DAYS * DAY,
  );

  const reviewableChanges: Decision["reviewableChanges"] = {};
  let websiteFill: string | null = null;
  const conflicts: Decision["conflicts"] = [];

  for (const [field, proposed] of Object.entries(verdict.proposed_changes) as [ChangeField, unknown][]) {
    if (proposed === null || proposed === undefined) continue;
    if (normalize(proposed) === normalize(currentValue(listing, field))) continue;

    if (field === "website" && !listing.website) {
      websiteFill = proposed as string;
      continue;
    }

    const confirmation = recentConfirmations.find((c) => c.field === field);
    if (confirmation) {
      conflicts.push({
        field,
        confirmedValue: confirmation.value,
        confirmedAt: new Date(confirmation.confirmedAt!).toISOString(),
        source: confirmation.source,
        proposed,
      });
    }
    (reviewableChanges as Record<string, unknown>)[field] = proposed;
  }

  // A human recently confirmed it's open, but the agent thinks otherwise
  const statusConfirmation = recentConfirmations.find((c) => c.field === "status");
  if (statusConfirmation && !["active", "active_with_changes"].includes(verdict.status)) {
    conflicts.push({
      field: "status",
      confirmedValue: statusConfirmation.value,
      confirmedAt: new Date(statusConfirmation.confirmedAt!).toISOString(),
      source: statusConfirmation.source,
      proposed: verdict.status,
    });
  }

  const googleOperational = places.match?.businessStatus === "OPERATIONAL";
  const recentEvidence = hasDatedEvidenceWithin(verdict, 90, now) || googleOperational;
  // Clearing a visitor's "closed" report needs a dated source, not just Google
  const freshEvidence = hasDatedEvidenceWithin(verdict, 30, now);

  const pending = (reason: string): Decision => ({
    resolution: "pending",
    reviewableChanges,
    websiteFill,
    conflicts,
    clearReport: false,
    reason,
  });

  if (!options.autoApprove) return pending("auto-approve is turned off");
  if (!["active", "active_with_changes"].includes(verdict.status)) return pending(`status is ${verdict.status}`);
  if (verdict.confidence !== "high") return pending(`confidence is ${verdict.confidence}`);
  if (Object.keys(reviewableChanges).length > 0) return pending("has changes to review");
  if (conflicts.length > 0) return pending("conflicts with a primary-source confirmation");
  if (!recentEvidence) return pending("no evidence from the last 90 days");
  if (listing.reportedClosed && !freshEvidence) return pending("visitor report needs evidence from the last 30 days");

  return {
    resolution: "auto_verified",
    reviewableChanges,
    websiteFill,
    conflicts,
    clearReport: !!listing.reportedClosed,
    reason: "high-confidence active with recent evidence",
  };
}
