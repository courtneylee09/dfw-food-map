import type { FoodResource } from "./schema";

function formatCallHint(phone?: string | null): string {
  if (!phone) {
    return "call before visiting";
  }

  return `call ${phone} before visiting`;
}

function fallbackHours(type?: string | null, phone?: string | null, appointmentRequired?: boolean | null): string {
  const callHint = formatCallHint(phone);

  if (type === "Community Fridge") {
    return "Open daily, often 24 hours; check on-site signage.";
  }

  if (type === "Youth Supper (CACFP)") {
    return "Operates on school days during after-school hours.";
  }

  if (type === "Senior Meals") {
    return `Weekday daytime meal service; ${callHint}.`;
  }

  if (type === "Grocery Distribution") {
    if (appointmentRequired) {
      return `Distribution by scheduled appointment; ${callHint}.`;
    }
    return `Distribution service operates on scheduled days; ${callHint}.`;
  }

  if (appointmentRequired) {
    return `Hours not currently listed; appointment is required, ${callHint}.`;
  }

  return `Hours not currently listed; ${callHint}.`;
}

interface NormalizeHoursInput {
  hours: string | null | undefined;
  type?: string | null;
  name?: string | null;
  phone?: string | null;
  appointmentRequired?: boolean | null;
}

export function normalizeHours(input: NormalizeHoursInput): string {
  const { hours, type, name, phone, appointmentRequired } = input;
  const value = (hours ?? "").trim();
  const lowerName = (name ?? "").toLowerCase();

  if (!value) {
    return fallbackHours(type, phone, appointmentRequired);
  }

  const lower = value.toLowerCase();

  if (/(website|web site|online|facebook|instagram|linktree|url)/i.test(value)) {
    return fallbackHours(type, phone, appointmentRequired);
  }

  if (lowerName.includes("soupmobile") || /mobile\s+(service|distribution)/i.test(value)) {
    return `Mobile distribution service; ${formatCallHint(phone)}.`;
  }

  if (lowerName.includes("union gospel") && /check\s+schedule|daily\s+meals/i.test(lower)) {
    return `Daily meal service; ${formatCallHint(phone)}.`;
  }

  if (lowerName.includes("oak cliff veggie") && /periodic\s+distributions?/i.test(lower)) {
    return `Distribution events occur on select dates; ${formatCallHint(phone)}.`;
  }

  if (lowerName.includes("older adult") && /provides\s+free\s+meals?\s+at/i.test(lower)) {
    return `Meal service is offered at participating senior centers; ${formatCallHint(phone)}.`;
  }

  if (/check\s+schedule|call\s+for\s+schedule|schedule\s+varies/i.test(lower)) {
    if (type === "Soup Kitchen" || type === "Hot Meal") {
      return `Daily meal service; ${formatCallHint(phone)}.`;
    }
    return `Hours vary by day; ${formatCallHint(phone)}.`;
  }

  if (/periodic\s+distributions?/i.test(lower)) {
    return `Distribution events occur on select dates; ${formatCallHint(phone)}.`;
  }

  if (/after\s+school\s+meal.*school\s+days?/i.test(lower)) {
    return "After-school meal service on school days.";
  }

  if (/provides\s+free\s+meals?\s+at/i.test(lower)) {
    return "Meal service is offered at participating centers; call for location and time.";
  }

  return value;
}

export function getDisplayHours(
  resource: Pick<FoodResource, "hours" | "type" | "name" | "phone" | "appointmentRequired">
): string {
  return normalizeHours({
    hours: resource.hours,
    type: resource.type,
    name: resource.name,
    phone: resource.phone,
    appointmentRequired: resource.appointmentRequired,
  });
}
