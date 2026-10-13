import Anthropic from "@anthropic-ai/sdk";
import type { FoodResource } from "../../shared/schema";
import type { Verdict } from "./agent";
import type { PlacesResult } from "./places";
import type { Decision } from "./policy";
import { checkEvidence, type CheckedEvidence } from "./quotes";
import { secondOpinion, type CheckerResult } from "./checker";

// Two-key auto-approval (docs/VERIFICATION_AGENT.md).
// A change is applied automatically only when (1) code confirms the cited quote
// is on the page and (2) an independent checker agrees the quote supports it.

const CLOSURE_STATUSES = new Set(["likely_closed", "not_food_program", "temporarily_closed"]);

export type TwoKeyResolution = "auto_verified" | "auto_applied" | "auto_hidden" | "unconfirmed" | "pending";

export interface TwoKeyOutcome {
  resolution: TwoKeyResolution;
  apply: Record<string, unknown>;
  remaining: Record<string, unknown>;
  hideReason: string | null;
  unhide: boolean;
  markVerified: boolean;
  reason: string;
  evidence: CheckedEvidence[];
  checker: CheckerResult | null;
}

type Claim = Pick<Verdict, "status" | "confidence" | "summary" | "evidence">;

function streetKey(address: string): string {
  const match = address.toLowerCase().match(/^\s*(\d+)\s+([a-z0-9.]+(?:\s+[a-z0-9.]+)?)/);
  return match ? `${match[1]} ${match[2].replace(/\./g, "")}` : "";
}

function addressMatchesGoogle(proposed: string, places: PlacesResult): boolean {
  const key = streetKey(proposed);
  if (!key) return false;
  const candidates = [places.match, ...places.candidates].filter(Boolean);
  return candidates.some((p) => streetKey(p!.address).startsWith(key) || key.startsWith(streetKey(p!.address)));
}

function hideReasonFor(claim: Claim, checker: CheckerResult): string {
  const label = {
    likely_closed: "Closed",
    not_food_program: "Not a food program",
    temporarily_closed: "Temporarily closed",
  }[claim.status as "likely_closed" | "not_food_program" | "temporarily_closed"];
  return `${label} (verification agent, ${new Date().toISOString().slice(0, 10)}): ${checker.reason}`.slice(0, 500);
}

export async function runTwoKey(
  client: Anthropic,
  listing: FoodResource,
  claim: Claim,
  decision: Decision,
  places: PlacesResult,
  options: { autoApprove: boolean },
): Promise<TwoKeyOutcome> {
  const changes = { ...decision.reviewableChanges } as Record<string, unknown>;
  const outcome = (o: Partial<TwoKeyOutcome> & { resolution: TwoKeyResolution; reason: string }): TwoKeyOutcome => ({
    apply: {},
    remaining: changes,
    hideReason: null,
    unhide: false,
    markVerified: false,
    evidence: [],
    checker: null,
    ...o,
  });

  if (decision.resolution === "auto_verified") {
    return outcome({ resolution: "auto_verified", remaining: {}, markVerified: true, unhide: !!listing.hidden, reason: decision.reason });
  }
  if (!options.autoApprove) return outcome({ resolution: "pending", reason: "auto-approve is turned off" });
  if (claim.status === "unverifiable") {
    return outcome({ resolution: "unconfirmed", remaining: {}, reason: "couldn't confirm from public sources" });
  }
  if (decision.conflicts.length > 0) {
    return outcome({ resolution: "pending", reason: "conflicts with a primary-source confirmation" });
  }
  if (claim.confidence === "low") return outcome({ resolution: "pending", reason: "confidence is low" });

  const evidence = await checkEvidence(claim as Verdict, places);
  if (!evidence.some((e) => e.quoteVerified)) {
    return outcome({ resolution: "pending", evidence, reason: "no cited quote could be found on its source page" });
  }

  const checker = await secondOpinion(client, listing, claim, changes, evidence);
  if (!checker) return outcome({ resolution: "pending", evidence, reason: "second check didn't complete" });
  if (checker.status !== "confirmed") {
    return outcome({ resolution: "pending", evidence, checker, reason: `second check: status ${checker.status}. ${checker.reason}` });
  }

  if (CLOSURE_STATUSES.has(claim.status)) {
    return outcome({
      resolution: "auto_hidden",
      remaining: {},
      hideReason: hideReasonFor(claim, checker),
      evidence,
      checker,
      reason: `both keys agree: ${claim.status}`,
    });
  }

  // Active: apply each change both keys agree on
  const apply: Record<string, unknown> = {};
  const remaining: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(changes)) {
    const confirmed = checker.fields[field] === "confirmed";
    const addressOk = field !== "address" || addressMatchesGoogle(String(value), places);
    if (confirmed && addressOk) apply[field] = value;
    else remaining[field] = value;
  }

  const complete = Object.keys(remaining).length === 0;
  return outcome({
    resolution: complete ? (Object.keys(apply).length ? "auto_applied" : "auto_verified") : "pending",
    apply,
    remaining,
    markVerified: complete,
    unhide: complete && !!listing.hidden,
    evidence,
    checker,
    reason: complete
      ? "both keys agree"
      : `second check didn't confirm: ${Object.keys(remaining).join(", ")}. ${checker.reason}`,
  });
}
