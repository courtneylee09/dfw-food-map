# Dallas-Fort Worth Food Resources Map

## Overview

The Dallas-Fort Worth Food Resources Map is a community-focused web application that helps Dallas-Fort Worth residents find free food resources including food pantries, community fridges, soup kitchens, hot meal programs, and other food assistance locations. The application prioritizes accessibility, mobile-first design, and ease of use - no login required, just open and find food resources nearby. Users can view resources on an interactive map, filter by type, view details, get directions, and submit new resources for community review.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type safety and modern React features
- Vite as the build tool and development server for fast hot module replacement
- Wouter for lightweight client-side routing (alternative to React Router)

**State Management**
- TanStack Query (React Query) for server state management, caching, and data fetching
- React hooks for local UI state management
- Query invalidation strategy: staleTime set to 0 for real-time location-based data

**UI Component System**
- Shadcn UI component library built on Radix UI primitives
- Tailwind CSS for utility-first styling with custom design system
- "New York" style variant with earth-tone color palette
- Custom CSS variables for theming (light mode optimized)
- Mobile-first responsive design with WCAG AAA contrast standards

**Design Philosophy**
- Grassroots utility-first approach prioritizing function over flourish
- High contrast color system for readability on damaged/low-brightness screens
- Large tap targets (minimum 44×44px) for accessibility
- Earth tones foundation: muted greens, warm tans, black
- Status indicators: vibrant green for "Open Now", muted red/orange for closed

**Map Integration**
- Leaflet library for interactive mapping
- OpenStreetMap tiles for base map layer
- Custom map markers differentiated by resource type using color-coded icons
- Resource types: Food Pantry, Community Fridge, Soup Kitchen, Hot Meal, Youth Supper (CACFP), Senior Meals, Grocery Distribution
- Dynamic zoom and center updates based on user location
- Selected marker state with visual scaling

**Location Services**
- Browser Geolocation API for user location detection
- Distance calculation using Haversine formula
- Automatic sorting of resources by proximity to user
- Fallback to Dallas-Fort Worth center (32.7767, -96.7970) when location unavailable

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running on Node.js
- RESTful API design pattern
- Vite middleware mode for development with HMR
- Production builds use esbuild for server bundling

**API Endpoints**
- `GET /api/resources` - Fetch all food resources with optional lat/lng query parameters for distance calculation and sorting
- Distance calculation performed server-side to reduce client payload
- Response includes formatted distance strings and raw distance values for sorting

**Development Workflow**
- Hot module replacement in development via Vite
- Separate client and server build processes
- TypeScript compilation with strict mode enabled
- Path aliases for clean imports (@, @shared, @assets)

### Data Layer

**Database Technology**
- PostgreSQL database via Neon serverless driver
- Connection pooling through @neondatabase/serverless
- WebSocket-based connection in Node.js environment

**ORM & Schema Management**
- Drizzle ORM for type-safe database operations
- Schema-first approach with TypeScript inference
- Migration management via Drizzle Kit stored in `/migrations` directory
- Schema located in `/shared/schema.ts` for frontend-backend type sharing

**Database Schema**
- `food_resources` table: Primary resource data
  - UUID primary key (generated server-side)
  - Resource metadata: name, type, address
  - Geolocation: latitude, longitude (stored as text)
  - Schedule information: hours, distance (calculated)
  - Contact: phone (optional)
  - Access: appointmentRequired (boolean, default false)
  
- `submissions` table: Community-submitted resources pending verification
  - Same structure as food_resources plus photoUrl field
  - Timestamp tracking with submittedAt field
  - Separate from main resources until verified by administrators

**Data Validation**
- Zod schemas generated from Drizzle table definitions
- Runtime validation for API requests and form submissions
- Type inference ensures frontend-backend contract

**Data Import Strategy**
- CSV import scripts in `/scripts` directory
- Geocoding integration via Geoapify API for address-to-coordinates conversion
- Bulk import with error handling and logging
- Support for updating existing records with new fields (phone, appointmentRequired)

### External Dependencies

**Third-Party Services**
- Geoapify Geocoding API: Address autocomplete and geocoding for resource locations and submissions
  - API key stored in environment variable `VITE_GEOAPIFY_API_KEY`
  - Used in AddressAutocomplete component and import scripts
  
- OpenStreetMap: Map tile provider for Leaflet maps
  - No API key required
  - Tile URL: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

**Database Hosting**
- Neon PostgreSQL serverless database
  - Connection string stored in `DATABASE_URL` environment variable
  - WebSocket connections for serverless compatibility
  - Automatic provisioning on Replit platform

**Key NPM Dependencies**
- `@radix-ui/*` - Accessible UI component primitives
- `leaflet` & `react-leaflet` - Interactive mapping
- `@geoapify/geocoder-autocomplete` - Address autocomplete widget
- `react-hook-form` & `@hookform/resolvers` - Form management and validation
- `drizzle-orm` & `drizzle-kit` - Database ORM and migrations
- `@neondatabase/serverless` - PostgreSQL driver for Neon
- `date-fns` - Date formatting utilities
- `tailwindcss` & `autoprefixer` - CSS styling framework
- `wouter` - Lightweight routing
- `zod` - Schema validation

**Environment Variables Required**
- `DATABASE_URL` - PostgreSQL connection string (required)
- `VITE_GEOAPIFY_API_KEY` - Geoapify API key for geocoding (required for address features)
- `NODE_ENV` - Environment indicator (development/production)

**Asset Management**
- Static assets in `/client/public` directory
- Logo image stored in `/attached_assets` directory
- Custom fonts: Inter from Google Fonts