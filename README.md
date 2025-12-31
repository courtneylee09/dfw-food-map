
# Dallas-Fort Worth Food Resources Map

A mobile-friendly community-focused web application to help Dallas-Fort Worth residents find free food resources including food pantries, community fridges, and hot meal programs.

## What is this?

This is a mobile-friendly map and directory that shows where people can find free food in the Dallas-Fort Worth area. No login required, no complicated setup - just open it and find food resources near you.

## Features

- Interactive map showing food resource locations
- Filter resources by type (food pantries, community fridges, hot meals)
- Mobile-optimized and fast
- Community submission form for new resources
- No login required for browsing

## For Non-Developers: Using This Project

### Option 1: Quick Start (Easiest)

1. Fork this project on GitHub or Replit
2. Follow the setup instructions in [SETUP.md](./SETUP.md)
3. Add your own food resource data using the CSV template in `/data/sample-food-resources.csv`
4. Deploy to share with your community

### Option 2: Customize for Your City

Want to create a food map for your own city?

1. Copy this project
2. Replace the sample data in `/data/` with your own food resources
3. Update the map center location in the client code
4. Replace the logo in `/assets/logo.png` with your own
5. Change branding and colors to match your community
6. Deploy and share!

## For Developers

### Project Structure

```
├── client/             # Frontend React app
│   ├── src/           # React components and pages
│   └── public/        # Static assets
├── server/            # Backend Express server
│   ├── db.ts          # Database connection
│   ├── routes.ts      # API routes
│   └── index.ts       # Server entry point
├── shared/            # Shared code (schema, types)
├── scripts/           # Database and utility scripts
│   ├── import-csv-to-db.ts         # Import CSV data
│   ├── geocode-addresses.ts        # Geocode addresses
│   └── seed-db.ts                  # Seed database
├── data/              # Sample data and CSV templates
├── docs/              # Project documentation
├── assets/            # Project images and resources
└── migrations/        # Database migrations
```

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS
- **Backend**: Express, Node.js
- **Database**: PostgreSQL with Drizzle ORM
- **Maps**: Leaflet & React Leaflet
- **Geocoding**: Geoapify

### Quick Start for Developers

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npm run db:push

# Import sample data (optional)
npx tsx scripts/import-csv-to-db.ts

# Start development server
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run check` - Type check
- `npm run db:push` - Push database schema changes

### Database Scripts

Located in `/scripts/`:

- `import-csv-to-db.ts` - Import food resources from CSV
- `geocode-addresses.ts` - Geocode addresses to get coordinates
- `seed-db.ts` - Seed database with initial data
- `add-columns.ts` - Database migration helper
- `check-db.ts` - Verify database contents
- `update-phone-and-appointment.ts` - Update resource details

## Data Format

Your CSV should include these columns:
- **id** - Unique identifier (optional, will auto-generate if not provided)
- **name** - Name of the food resource
- **type** - Type of resource (Food Pantry, Community Fridge, Hot Meal, Soup Kitchen, etc.)
- **address** - Full address including city, state, and zip code (e.g., "123 Main St, Dallas, TX 75201")
- **phone** - Contact phone number (optional)
- **latitude** - Latitude coordinate (leave empty if you'll geocode later)
- **longitude** - Longitude coordinate (leave empty if you'll geocode later)
- **hours** - Operating hours (e.g., "MON-FRI: 9:00am-5:00pm")
- **distance** - Distance information (optional, used for display purposes)
- **appointment_required** - Whether appointment is needed (Yes, No, or leave empty)

See `/data/sample-food-resources.csv` for an example.

## Contributing

We welcome contributions! Whether you're:
- Adding new food resources
- Fixing bugs
- Improving documentation
- Adding new features

Please feel free to submit a pull request or open an issue.

## License

MIT License - feel free to use this for your own community!

## Questions or Need Help?

- Check out the [SETUP.md](./SETUP.md) guide
- Review the [docs/](./docs/) folder for more details
- Open an issue on GitHub

## Acknowledgments

Built to serve the Dallas-Fort Worth community and help people find the food resources they need.

---

Made with care for the community. Fork it, customize it, and help people in your city find food resources!
