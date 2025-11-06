# Detroit Food Resources App

## Overview

This is a community-focused web application designed to help Detroit residents locate free food resources including food pantries, community fridges, and hot meal programs. The app prioritizes accessibility, speed, and ease of use for mobile devices, with no login required. It features an interactive map view, filterable resource listings, and community submission capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript using Vite as the build tool and development server.

**Routing**: Wouter for client-side routing (lightweight alternative to React Router).

**State Management**: TanStack Query (React Query) for server state management and data fetching. Local component state using React hooks for UI interactions.

**UI Components**: Shadcn UI component library built on Radix UI primitives with Tailwind CSS for styling. The design system uses a "New York" style variant with earth-tone color palette optimized for accessibility.

**Design Philosophy**: Mobile-first, utility-focused design with emphasis on high contrast (WCAG AAA standards), large tap targets (minimum 44x44px), and readability on damaged/low-brightness screens. Uses warm earth tones (muted greens, tans) with generous spacing.

**Map Integration**: Leaflet library with OpenStreetMap tiles for displaying food resource locations. Custom map markers differentiate resource types (Food Pantry, Community Fridge, Hot Meal) with color-coded icons.

### Backend Architecture

**Server Framework**: Express.js running on Node.js with TypeScript.

**Development Setup**: Vite middleware mode for hot module replacement during development. Production builds use esbuild for server bundling.

**API Pattern**: RESTful API design (routes registered through `registerRoutes` function, though current implementation shows minimal API endpoints).

**Storage Strategy**: Currently uses in-memory storage (`MemStorage` class) for user data. Architecture supports interface-based storage allowing easy migration to persistent database.

### Data Layer

**ORM**: Drizzle ORM configured for PostgreSQL with Neon serverless driver.

**Database Schema**: 
- `food_resources` table: Stores resource locations with name, type, address, coordinates (lat/lng as text), hours, open status, and distance
- `submissions` table: Community-submitted resources awaiting verification with photo URL support

**Schema Validation**: Zod schemas generated from Drizzle tables for runtime type safety and API validation.

**Migration Strategy**: Drizzle Kit for schema migrations stored in `/migrations` directory.

### Frontend-Backend Integration

**API Communication**: Fetch API with custom `apiRequest` wrapper handling JSON serialization, credentials, and error responses.

**Type Safety**: Shared schema definitions in `/shared` directory imported by both frontend and backend ensuring type consistency.

**Data Flow**: React Query manages caching, refetching, and synchronization with default configuration disabling automatic refetching (set to `Infinity` staleTime).

## External Dependencies

### Core Libraries
- **@neondatabase/serverless**: Serverless PostgreSQL driver for Neon database platform
- **drizzle-orm**: TypeScript ORM with zero-dependency architecture
- **leaflet**: Interactive map library for displaying resource locations
- **wouter**: Lightweight client-side routing (1.3KB alternative to React Router)

### UI Framework
- **Radix UI**: Complete collection of accessible, unstyled UI primitives (accordion, dialog, dropdown, etc.)
- **Tailwind CSS**: Utility-first CSS framework with custom configuration for earth-tone design system
- **shadcn/ui**: Pre-built component library combining Radix UI + Tailwind with consistent styling

### Form Handling
- **react-hook-form**: Performant form state management with validation
- **@hookform/resolvers**: Integration layer for validation libraries
- **zod**: Schema validation library integrated with Drizzle for type-safe forms

### Development Tools
- **Vite**: Fast build tool and dev server with HMR support
- **@replit/vite-plugin-***: Replit-specific plugins for runtime error overlay, cartographer, and dev banner
- **tsx**: TypeScript execution for development server
- **esbuild**: Fast JavaScript bundler for production server build

### Utility Libraries
- **date-fns**: Modern date utility library
- **clsx + tailwind-merge**: Class name merging utilities (combined in `cn` helper)
- **class-variance-authority**: Component variant management for styled components
- **nanoid**: Compact URL-safe unique ID generator

### Database Infrastructure
- **connect-pg-simple**: PostgreSQL session store (dependency present though session management not fully implemented)
- **drizzle-kit**: CLI tool for database migrations and schema management
- **drizzle-zod**: Automatic Zod schema generation from Drizzle tables

### Map Dependencies
- **@types/leaflet**: TypeScript definitions for Leaflet library
- **OpenStreetMap**: Tile provider for map data (external service, no package dependency)

### Notable Architectural Decisions

**Why In-Memory Storage**: Current implementation uses `MemStorage` as a placeholder. The interface-based design (`IStorage`) allows seamless swapping to Drizzle-based PostgreSQL storage without changing business logic.

**Why Leaflet Over Mapbox**: Leaflet chosen for its open-source nature, lighter weight, and compatibility with free OpenStreetMap tiles—critical for a grassroots community tool with no budget.

**Why Wouter Over React Router**: At 1.3KB, Wouter provides essential routing with minimal overhead, aligning with the app's performance-first philosophy for mobile users on limited data.

**Design Token Approach**: Custom CSS variables in `index.css` for theme colors rather than hardcoded Tailwind values, enabling potential dark mode support and consistent color application across components.

**No Authentication System**: Intentionally omitted to reduce barriers to access. Users can view resources immediately without accounts, supporting the mutual aid mission.

**Mobile-First Responsiveness**: Optimized for iPhone 15 Safari with dynamic viewport height (`100dvh`) support to handle collapsing address bars. Custom `h-screen-safe` utility class and `--app-height` CSS variable ensure proper full-screen layouts on mobile. All interactive elements meet 44px minimum touch target size (Apple's recommended guideline). Horizontal scrolling prevented via `overflow-x-hidden` on body and root elements. Filter pills use horizontal scroll with snap points for mobile-friendly navigation.