import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  fieldConfirmations,
  foodResources,
  verificationChecks,
  type FieldConfirmation,
  type FoodResource,
  type VerificationCheck,
} from "@shared/schema";

// Admin review of verification agent results (docs/VERIFICATION_AGENT.md → Admin page).

export type ConfirmedVia = "evidence" | "admin_call" | "site_visit" | "org_contact";
export type ResolveAction = "verify" | "apply" | "hide" | "dismiss";

const PRIMARY_SOURCES: ConfirmedVia[] = ["admin_call", "site_visit", "org_contact"];

// Fields an admin can change from the review queue, keyed by the agent's field names
const EDITABLE_FIELDS = {
  hours: "hours",
  phone: "phone",
  address: "address",
  website: "website",
  appointment_required: "appointmentRequired",
  notes: "notes",
} as const;
type EditableField = keyof typeof EDITABLE_FIELDS;

export interface ReviewItem {
  check: VerificationCheck;
  resource: FoodResource;
  confirmations: FieldConfirmation[];
}

export async function getReviewQueue(): Promise<ReviewItem[]> {
  const pending: VerificationCheck[] = await db
    .select()
    .from(verificationChecks)
    .where(eq(verificationChecks.resolution, "pending"))
    .orderBy(desc(verificationChecks.checkedAt));
  return attachResources(pending);
}

export async function getRecentAutoVerified(limit = 50): Promise<ReviewItem[]> {
  const checks: VerificationCheck[] = await db
    .select()
    .from(verificationChecks)
    .where(eq(verificationChecks.resolution, "auto_verified"))
    .orderBy(desc(verificationChecks.checkedAt))
    .limit(limit);
  return attachResources(checks);
}

async function attachResources(checks: VerificationCheck[]): Promise<ReviewItem[]> {
  if (checks.length === 0) return [];
  const ids = Array.from(new Set(checks.map((c) => c.resourceId)));
  const resources: FoodResource[] = await db.select().from(foodResources).where(inArray(foodResources.id, ids));
  const confirmations: FieldConfirmation[] = await db
    .select()
    .from(fieldConfirmations)
    .where(inArray(fieldConfirmations.resourceId, ids));
  const byId = new Map(resources.map((r) => [r.id, r]));
  return checks
    .filter((c) => byId.has(c.resourceId))
    .map((check) => ({
      check,
      resource: byId.get(check.resourceId)!,
      confirmations: confirmations.filter((c) => c.resourceId === check.resourceId),
    }));
}

async function geocode(address: string): Promise<{ lat: string; lng: string } | null> {
  const apiKey = process.env.GEOAPIFY_API_KEY || process.env.VITE_GEOAPIFY_API_KEY;
  if (!apiKey) return null;
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&filter=countrycode:us&limit=1&apiKey=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  const coords = data.features?.[0]?.geometry?.coordinates;
  return coords ? { lng: String(coords[0]), lat: String(coords[1]) } : null;
}

export class ResolveError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export async function resolveCheck(
  checkId: string,
  input: {
    action: ResolveAction;
    changes?: Partial<Record<EditableField, unknown>>;
    confirmedVia?: ConfirmedVia;
    note?: string;
  },
): Promise<void> {
  const [check]: VerificationCheck[] = await db
    .select()
    .from(verificationChecks)
    .where(eq(verificationChecks.id, checkId))
    .limit(1);
  if (!check) throw new ResolveError("Check not found", 404);
  if (check.resolution !== "pending") throw new ResolveError("This check was already resolved", 409);

  const confirmedVia: ConfirmedVia = input.confirmedVia ?? "evidence";
  const isPrimary = PRIMARY_SOURCES.includes(confirmedVia);
  const now = new Date();

  const resourceUpdates: Partial<FoodResource> = {};
  const confirmedFields: Array<{ field: string; value: string | null }> = [];

  if (input.action === "apply") {
    for (const [field, value] of Object.entries(input.changes ?? {})) {
      if (!(field in EDITABLE_FIELDS)) throw new ResolveError(`Field "${field}" can't be changed here`);
      const column = EDITABLE_FIELDS[field as EditableField];
      if (column === "appointmentRequired") {
        resourceUpdates.appointmentRequired = Boolean(value);
      } else {
        (resourceUpdates as Record<string, unknown>)[column] = value === "" ? null : String(value);
      }
      confirmedFields.push({ field, value: value === null || value === undefined ? null : String(value) });
    }
    if (typeof resourceUpdates.address === "string") {
      const coords = await geocode(resourceUpdates.address);
      if (!coords) throw new ResolveError("Couldn't find map coordinates for the new address; check it and try again");
      resourceUpdates.latitude = coords.lat;
      resourceUpdates.longitude = coords.lng;
    }
  }

  if (input.action === "verify" || input.action === "apply") {
    resourceUpdates.lastVerifiedDate = now;
    resourceUpdates.verificationSource = isPrimary ? "manual" : "admin_review";
    resourceUpdates.reportedClosed = false;
    resourceUpdates.reportedClosedCount = "0";
    resourceUpdates.reportedClosedAt = null;
    confirmedFields.push({ field: "status", value: "active" });
  }

  if (input.action === "hide") {
    resourceUpdates.hidden = true;
    resourceUpdates.hiddenReason = input.note?.trim() || `Hidden after review: ${check.status} — ${check.summary ?? ""}`.slice(0, 500);
    confirmedFields.push({ field: "status", value: "closed" });
  }

  const resolution = {
    verify: "approved",
    apply: "changes_applied",
    hide: "hidden",
    dismiss: "dismissed",
  }[input.action];

  await db.transaction(async (tx: typeof db) => {
    if (Object.keys(resourceUpdates).length > 0) {
      await tx.update(foodResources).set(resourceUpdates).where(eq(foodResources.id, check.resourceId));
    }
    if (isPrimary && input.action !== "dismiss") {
      for (const { field, value } of confirmedFields) {
        await tx.insert(fieldConfirmations).values({
          resourceId: check.resourceId,
          field,
          value,
          source: confirmedVia,
          note: input.note?.trim() || null,
          confirmedAt: now,
        });
      }
    }
    await tx
      .update(verificationChecks)
      .set({
        resolution,
        resolvedAt: now,
        resolutionNote: [`confirmed via ${confirmedVia}`, input.note?.trim()].filter(Boolean).join(" — "),
      })
      .where(and(eq(verificationChecks.id, checkId), eq(verificationChecks.resolution, "pending")));
  });
}
