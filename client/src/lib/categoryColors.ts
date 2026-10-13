import type { Category } from '@shared/categories';

// One color per category, shared by map markers, filter pills, and list cards.
// Validated so every pair stays distinct with normal vision (OKLab ΔE ≥ 16)
// and for color-blind visitors (simulated ΔE ≥ 8), across all pairs.

export interface CategoryColor {
  // Main fill (markers, active pill, card badge)
  fill: string;
  // Darker shade for outlines and colored text on white
  dark: string;
  // Text color on top of `fill`
  onFill: string;
}

export const categoryColors: Record<Category, CategoryColor> = {
  'Food Pantry': { fill: '#0369a1', dark: '#024c74', onFill: '#ffffff' },
  'Free Meals': { fill: '#ea580c', dark: '#a83f09', onFill: '#1f0b00' },
  "Kids' Free Meals": { fill: '#7c3aed', dark: '#592aab', onFill: '#ffffff' },
  'Senior Meals': { fill: '#be185d', dark: '#891143', onFill: '#ffffff' },
  'Food Distribution': { fill: '#854d0e', dark: '#60370a', onFill: '#ffffff' },
  'Community Fridge': { fill: '#0e9f9a', dark: '#0a726f', onFill: '#06201f' },
};

export function getCategoryColor(type: string): CategoryColor {
  return categoryColors[type as Category] ?? categoryColors['Food Pantry'];
}
