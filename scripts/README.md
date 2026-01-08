# Database Scripts

This folder contains utility scripts for managing your food resources database.

## Scripts Overview

### `weekly-verification.ts` ⭐ NEW
**Identifies locations that need verification to ensure data accuracy.**

**Usage:**
```bash
# Run with default 60-day threshold
npm run verify:weekly

# Run with custom threshold
npx tsx scripts/weekly-verification.ts --days=90

# Export results to CSV
npm run verify:csv
```

**What it does:**
- Scans database for locations not verified in 60+ days
- Identifies locations reported as closed by users
- Generates detailed report sorted by urgency
- Optionally exports to CSV for spreadsheet review

**Output includes:**
- Total resources and verification statistics
- List of locations needing attention
- Days since last verification
- Report counts for flagged locations

**Recommended:** Set up as weekly cron job to automate monitoring.

---

### `import-csv-to-db.ts`
Imports food resource data from a CSV file into the database.

**Usage:**
```bash
npx tsx scripts/import-csv-to-db.ts data/your-file.csv
```

**What it does:**
- Reads a CSV file with food resource information
- Validates the data format
- Inserts resources into the database
- Reports success/failure for each entry

**CSV Format Required:**
- id, name, type, address, phone, latitude, longitude, hours, distance, appointment_required

**Note:** The `id`, `latitude`, `longitude`, `distance`, and `appointment_required` fields are optional. If `latitude` and `longitude` are empty, you can geocode them later using the `geocode-addresses.ts` script.

---

### `geocode-addresses.ts`
Converts street addresses to geographic coordinates (latitude/longitude) for map display.

**Usage:**
```bash
npx tsx scripts/geocode-addresses.ts
```

**What it does:**
- Automatically finds all resources without coordinates in the database
- Validates API key before starting
- Uses Geoapify API to geocode addresses with retry logic
- Handles rate limiting intelligently
- Validates coordinates are in expected geographic area
- Updates database with latitude and longitude
- Saves detailed results to `geocoding-results.json`
- Saves failed addresses to `geocoding-failed.json` for manual review

**Features that make it foolproof:**
- ✓ API key validation before processing
- ✓ Automatic retry on failures (3 attempts per address)
- ✓ Rate limit handling with exponential backoff
- ✓ Geographic bounds validation (warns if coordinates seem wrong)
- ✓ Empty address detection
- ✓ Progress tracking with detailed logs
- ✓ Exports failed addresses for manual fixing
- ✓ Success rate reporting

**Requirements:**
- `GEOAPIFY_API_KEY` or `VITE_GEOAPIFY_API_KEY` environment variable must be set
- Free tier allows 3,000 requests per day
- Get a free key at: https://www.geoapify.com/

**Troubleshooting:**
- If geocoding fails, check `geocoding-failed.json` for details
- Verify addresses include city, state, and zip code
- Test problematic addresses at https://www.geoapify.com/tools/geocoding-online
- You can manually add coordinates to CSV and re-import

---

### `seed-db.ts`
Seeds the database with initial sample data.

**Usage:**
```bash
npx tsx scripts/seed-db.ts
```

**What it does:**
- Clears existing data (use with caution!)
- Inserts predefined sample food resources
- Useful for testing or initial setup

---

### `add-columns.ts`
Database migration helper for adding new columns to the schema.

**Usage:**
```bash
npx tsx scripts/add-columns.ts
```

**What it does:**
- Adds new columns to existing database tables
- Used when upgrading the schema
- Modify this script based on your needs

---

### `check-db.ts`
Verifies database contents and connection.

**Usage:**
```bash
npx tsx scripts/check-db.ts
```

**What it does:**
- Tests database connection
- Counts total resources
- Shows sample data
- Lists resources missing coordinates
- Useful for debugging

---

### `update-phone-and-appointment.ts`
Updates phone numbers and appointment information for resources.

**Usage:**
```bash
npx tsx scripts/update-phone-and-appointment.ts
```

**What it does:**
- Updates specific resource fields
- Useful for bulk updates
- Modify the script to match your update needs

---

### `final-check.ts`
Runs final validation checks before deployment.

**Usage:**
```bash
npx tsx scripts/final-check.ts
```

**What it does:**
- Validates all data is properly formatted
- Checks for missing required fields
- Verifies geocoding is complete
- Reports any issues found

---

## Common Workflow

### Initial Setup
```bash
# 1. Import your data
npx tsx scripts/import-csv-to-db.ts data/your-data.csv

# 2. Geocode addresses
npx tsx scripts/geocode-addresses.ts

# 3. Verify everything
npx tsx scripts/check-db.ts
```

### Adding New Data
```bash
# 1. Import new CSV
npx tsx scripts/import-csv-to-db.ts data/new-resources.csv

# 2. Geocode new addresses
npx tsx scripts/geocode-addresses.ts

# 3. Check results
npx tsx scripts/check-db.ts
```

### Troubleshooting
```bash
# Check database status
npx tsx scripts/check-db.ts

# Run final validation
npx tsx scripts/final-check.ts
```

---

## Tips

- Always backup your database before running destructive scripts
- Run `check-db.ts` after any import or update operation
- Keep your `GEOAPIFY_API_KEY` in the `.env` file, never commit it
- Geocoding can take time for large datasets (rate limits apply)
- Test scripts on sample data before running on production database

---

## Need Help?

- Check the main [SETUP.md](../SETUP.md) guide
- Review environment variables in `.env.example`
- Open an issue on GitHub if you encounter problems
