# Neon Database Setup - Step by Step

Follow these steps to set up your free Neon PostgreSQL database.

## Step 1: Sign Up for Neon

1. Go to **https://neon.tech**
2. Click **"Sign Up"** (top right)
3. Choose to sign up with:
   - **GitHub** (recommended - fastest)
   - **Google**
   - **Email** (if you prefer)

## Step 2: Create a New Project

1. After signing in, you'll see the Neon dashboard
2. Click **"Create a project"** button
3. Fill in the details:
   - **Project name**: `dfw-food-map` (or any name you like)
   - **Region**: Choose closest to you (e.g., `US East` for Dallas area)
   - **PostgreSQL version**: Leave as default (latest)
4. Click **"Create project"**

## Step 3: Get Your Connection String

1. Once your project is created, you'll see the dashboard
2. Look for a section that says **"Connection string"** or **"Connection details"**
3. You'll see something like:
   ```
   postgresql://username:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Click the **"Copy"** button next to the connection string
5. **IMPORTANT**: Save this somewhere safe - you'll need it in the next step!

## Step 4: Add to Your Project

Once you have the connection string, I'll help you:
- Add it to your `.env` file
- Create the database tables
- Migrate your existing data
- Test the connection

---

## What You'll See in Neon Dashboard

- **Project Overview**: Shows your database status
- **Connection String**: The string you need to copy
- **Usage**: Shows your free tier usage (1 GB storage, 100k requests/month)
- **Settings**: Where you can manage your project

## Tips

- The connection string includes your password - keep it secure!
- Neon automatically handles backups
- Your database will "sleep" when not in use (saves resources)
- First connection after sleep takes ~1-2 seconds (then it's fast)

---

**Ready?** Once you have your connection string, paste it here and I'll set everything up!



