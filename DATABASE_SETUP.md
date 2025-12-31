# Database Setup Guide - Making Data Persistent

This guide will help you set up a database so your food resources are saved permanently instead of being lost when the server restarts.

## Quick Overview

The app now automatically uses database storage when `DATABASE_URL` is set, and falls back to in-memory storage otherwise.

## Step 1: Get a Database

You have several options for a PostgreSQL database:

### Option A: Neon (Free, Recommended)
1. Go to [neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project
4. Copy the connection string (it will look like: `postgresql://user:password@host/database?sslmode=require`)

### Option B: Supabase (Free)
1. Go to [supabase.com](https://supabase.com)
2. Sign up and create a new project
3. Go to Settings → Database
4. Copy the connection string

### Option C: Local PostgreSQL
1. Install PostgreSQL on your computer
2. Create a database: `createdb foodmap`
3. Connection string: `postgresql://localhost:5432/foodmap`

### Option D: Railway (Free tier available)
1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Add a PostgreSQL database
4. Copy the connection string from the database service

## Step 2: Set Up Environment Variable

Create a `.env` file in the root directory (`DFW-Food-Map/DFW-Food-Map/`):

```env
DATABASE_URL=postgresql://your-connection-string-here
```

**Important:** 
- Never commit the `.env` file to git (it's already in `.gitignore`)
- Replace `your-connection-string-here` with your actual database connection string

## Step 3: Create Database Tables

Run this command to create the necessary tables:

```bash
npm run db:push
```

This will create the `food_resources` and `submissions` tables in your database.

## Step 4: Migrate Existing Data (Optional)

If you have data in the in-memory storage that you want to keep, run:

```bash
npx tsx scripts/migrate-to-db.ts
```

This will add the sample data (including the Lancaster address) to your database.

## Step 5: Restart Your Server

Stop your current server (Ctrl+C) and restart it:

```bash
npm run dev
```

The app will now automatically use the database!

## Verify It's Working

1. Add a new resource through the web interface
2. Stop the server (Ctrl+C)
3. Start the server again (`npm run dev`)
4. Refresh your browser - the resource should still be there! ✅

## Adding More Data

### Via Web Interface
- Use the "Submit a Resource" form in the app
- Data is saved directly to the database

### Via CSV Import
```bash
npx tsx scripts/import-csv-to-db.ts data/your-file.csv
```

### Via Script
Edit `scripts/seed-db.ts` and run:
```bash
npx tsx scripts/seed-db.ts
```

## Checking Your Database

To see what's in your database:

```bash
npx tsx scripts/check-db.ts
```

## Troubleshooting

### "Database not configured" error
- Make sure `DATABASE_URL` is set in your `.env` file
- Restart your server after adding the `.env` file

### "Connection refused" error
- Check that your database is running (if local)
- Verify your connection string is correct
- For cloud databases, check that your IP is allowed (if required)

### Tables don't exist
- Run `npm run db:push` to create the tables

### Data not persisting
- Check that `DATABASE_URL` is set correctly
- Verify the server is using `DbStorage` (check server logs for warnings)
- Make sure you ran `npm run db:push` to create tables

## What Changed?

- **Before:** Data was stored in memory (lost on restart)
- **After:** Data is stored in PostgreSQL database (persists forever)

The code automatically detects if `DATABASE_URL` is set and uses the appropriate storage method.



