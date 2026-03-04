import type { FoodResource } from "./schema";

function fallbackHours(type?: string | null): string {
  if (type === "Community Fridge") {
    return "Open daily, often 24 hours; check on-site signage.";
  }

  if (type === "Youth Supper (CACFP)") {
    return "Operates on school days during after-school hours.";
  }

  if (type === "Senior Meals") {
    return "Weekday daytime meal service; call to confirm serving time.";
  }

  if (type === "Grocery Distribution") {
    return "Distribution service operates on scheduled days; call before visiting.";
  }

  return "Hours not currently listed; call before visiting.";
}

export function normalizeHours(hours: string | null | undefined, type?: string | null): string {
  const value = (hours ?? "").trim();

  if (!value) {
    return fallbackHours(type);
  }

  const lower = value.toLowerCase();

  if (/(website|web site|online|facebook|instagram|linktree|url)/i.test(value)) {
    return fallbackHours(type);
  }

  if (/mobile\s+(service|distribution)/i.test(value)) {
    return "Mobile distribution service; call for today's route and serving time.";
  }

  if (/check\s+schedule|call\s+for\s+schedule|schedule\s+varies/i.test(lower)) {
    if (type === "Soup Kitchen" || type === "Hot Meal") {
      return "Daily meal service; call to confirm today's serving times.";
    }
    return "Hours vary by day; call before visiting.";
  }

  if (/periodic\s+distributions?/i.test(lower)) {
    return "Distribution events occur on select dates; call before visiting.";
  }

  if (/after\s+school\s+meal.*school\s+days?/i.test(lower)) {
    return "After-school meal service on school days.";
  }

  if (/provides\s+free\s+meals?\s+at/i.test(lower)) {
    return "Meal service is offered at participating centers; call for location and time.";
  }

  return value;
}

export function getDisplayHours(resource: Pick<FoodResource, "hours" | "type">): string {
  return normalizeHours(resource.hours, resource.type);
}
