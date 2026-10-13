// The map's categories, in display order. Every list of categories in the app
// (filters, forms, colors, icons) comes from here, so names can't drift apart.
export const CATEGORIES = [
  "Food Pantry",
  "Free Meals",
  "Kids' Free Meals",
  "Senior Meals",
  "Food Distribution",
  "Community Fridge",
] as const;

export type Category = (typeof CATEGORIES)[number];

// Category names used before Oct 2026, mapped to their current name
export const LEGACY_CATEGORY_NAMES: Record<string, Category> = {
  "Soup Kitchen": "Free Meals",
  "Hot Meal": "Free Meals",
  "Youth Supper (CACFP)": "Kids' Free Meals",
  "Youth Supper": "Kids' Free Meals",
  "Grocery Distribution": "Food Distribution",
};
