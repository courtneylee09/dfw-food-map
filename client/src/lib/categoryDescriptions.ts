import type { FilterType } from '@/components/FilterPills';

// Plain-language descriptions shown when a category filter is selected.
// Rules vary by location, so these say "usually" and point people to each listing.

export interface CategoryDescription {
  whatYouGet: string;
  whoItsFor: string;
  goodToKnow: string;
}

export const categoryDescriptions: Record<Exclude<FilterType, 'All'>, CategoryDescription> = {
  'Food Pantry': {
    whatYouGet:
      'Free groceries to take home and cook, such as canned goods, rice, pasta, cereal, and sometimes fresh produce, bread, or meat.',
    whoItsFor: 'Individuals and families who need help stretching their food budget.',
    goodToKnow:
      'Many pantries ask for a photo ID and proof of address and serve you once a month. Some require an appointment, so check the listing or call ahead.',
  },
  'Community Fridge': {
    whatYouGet:
      'A public refrigerator, often with a pantry shelf, stocked by neighbors and local groups with free food you can take right away.',
    whoItsFor: 'Anyone. No ID, no sign-up, and no questions asked. Take what you need, and leave what you can.',
    goodToKnow: "Usually open 24/7, but what's inside changes throughout the day.",
  },
  'Soup Kitchen': {
    whatYouGet: 'A free, ready-to-eat meal served on site.',
    whoItsFor:
      'Anyone who is hungry, including people experiencing homelessness. Usually no ID or paperwork needed.',
    goodToKnow: 'Meals are served at set times. Arrive early, because some serve until food runs out.',
  },
  'Hot Meal': {
    whatYouGet:
      'A free prepared meal, often hosted by a church or community group. Some are dine-in and some are to-go.',
    whoItsFor: 'Anyone in the community. Usually no ID needed.',
    goodToKnow: 'Many happen only on certain days of the week, so check the schedule on the listing.',
  },
  'Youth Supper (CACFP)': {
    whatYouGet:
      'A free, nutritious supper or after-school meal for kids and teens, funded by the federal Child and Adult Care Food Program (CACFP).',
    whoItsFor: 'Children and teens 18 and under. No sign-up or income check is usually needed.',
    goodToKnow:
      'Meals are usually eaten on site at rec centers, libraries, or after-school programs, and are typically served on school days.',
  },
  'Senior Meals': {
    whatYouGet:
      'Free or low-cost hot meals for older adults, served at senior centers. Some programs also deliver meals to people who are homebound.',
    whoItsFor: 'Adults 60 and older, and sometimes their spouses.',
    goodToKnow: 'A small donation may be suggested but is never required. Some sites ask you to register first.',
  },
  'Grocery Distribution': {
    whatYouGet:
      'Large, free grocery giveaways, often drive-through or walk-up, with boxes of produce, dairy, meat, and shelf-stable food.',
    whoItsFor: 'Any household that needs food. Some ask for basic household information.',
    goodToKnow:
      'They happen on specific dates and times, and lines form early. Bring bags or clear space in your trunk.',
  },
};
