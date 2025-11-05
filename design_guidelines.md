# Detroit Food Resources App - Design Guidelines

## Design Approach
**Utility-First Community Tool**: This is a grassroots mutual aid app focused on speed, accessibility, and community trust. Design decisions prioritize function and readability over visual flourish. Think "block club meets design lab" — grounded, warm, and practical.

## Color System
- **Earth Tones Foundation**: Rich muted greens, warm tans, and black for primary UI
- **Status Indicators**: Vibrant green for "Open Now", muted red/orange for closed status
- **High Contrast Required**: All text must pass WCAG AAA standards for cracked screen readability
- **Low Brightness Optimization**: Avoid pure white backgrounds; use warm off-whites/light tans

## Typography
- **Size Scale**: 16px minimum for body text, 18-20px for primary actions and labels
- **Increased Line Height**: 1.6-1.8 for optimal readability
- **Font Selection**: Choose a warm, approachable sans-serif with excellent legibility (e.g., Inter, Public Sans, or similar)
- **Hierarchy**: Bold weight for resource names and CTAs, regular for supporting info, medium for labels

## Spacing System
**Mobile-First Tap Targets**: Use Tailwind spacing units of 3, 4, 6, and 8 for generous spacing
- Minimum button/tap target: 44×44px (h-11 minimum)
- Card padding: p-4 to p-6
- Section spacing: py-6 to py-8
- Between-element spacing: gap-3 to gap-4

## Core Components

### Map Interface
- **Integration**: Leaflet or Mapbox GL JS with OpenStreetMap tiles
- **Custom Pin Design**: Simple, bold markers in brand earth tones with resource type icons
- **Active State**: Selected pin enlarges with subtle shadow
- **Zoom Controls**: Large, easily tappable buttons positioned bottom-right

### Filter Pills
- **Layout**: Horizontal scroll row with snap-scroll behavior
- **Visual Style**: Rounded-full with border, filled background when active
- **Size**: px-4 py-2 minimum, with bold labels
- **Active State**: Filled with primary green, white text

### Resource Cards (List View)
```
Structure per card:
- Resource Name (text-lg font-bold)
- Type Badge (inline, text-xs uppercase in muted color)
- Distance (text-sm, secondary color)
- Open/Closed Indicator (bold, color-coded pill)
- Tap entire card to view detail
```
- **Card Design**: Soft rounded corners (rounded-lg), subtle shadow, white/off-white background
- **Spacing**: gap-3 between cards, p-4 internal padding
- **Visual Hierarchy**: Name dominates, status indicator prominent in top-right

### Detail Page Layout
- **Hero Area**: Resource name + type badge at top
- **Information Blocks**: 
  - Address with "Tap to open in Maps" affordance (underlined or with arrow icon)
  - Hours displayed clearly with OPEN NOW label if applicable
  - Large, full-width "Suggest an Update" button at bottom
- **Back Navigation**: Large, clear back arrow top-left

### Submission Form
- **Field Design**: Large input boxes (min h-12), rounded corners, clear labels above fields
- **Photo Upload**: Simple card-style dropzone with icon and "Add Photo" text
- **Submit Button**: Full-width, prominent, in primary brand color
- **Success State**: Simple confirmation message with checkmark icon

### Add to Home Screen Modal
- **Style**: Centered card overlay with semi-transparent backdrop
- **Content**: Friendly icon, brief headline ("Add to Home Screen"), one-line benefit, two buttons (Add / Maybe Later)
- **Tone**: Warm and inviting, not pushy

## Accessibility Standards
- **Contrast**: Minimum 7:1 for all text (AAA standard)
- **Touch Targets**: 44px minimum in all dimensions
- **Focus States**: Thick, high-contrast outlines on all interactive elements
- **Loading States**: Clear skeleton screens and loading indicators
- **Error States**: Inline validation with clear, friendly messaging

## Navigation Pattern
- **Bottom Tab Bar** (if multi-page): Large icons with labels, home and submit as primary tabs
- **Single Page Flow**: Home → List → Detail → Back (linear, simple)
- **Location Permission**: Friendly prompt explaining why location helps find nearby resources

## Images
**Map Background**: Primary visual element on home screen showing Detroit streets with resource pins overlaid. Use warm, slightly desaturated map styling to match brand earth tones.

**Optional Resource Photos**: User-submitted photos in detail view (if available), displayed as rounded cards above address information.

**No Hero Images**: This is a utility app, not a marketing page. Lead with the map and actionable filters.