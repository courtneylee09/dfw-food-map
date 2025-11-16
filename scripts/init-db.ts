import { sql } from "drizzle-orm";
import { db } from "../server/db";

async function initDatabase() {
  try {
    console.log("Creating tables...");
    
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS food_resources (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        latitude TEXT NOT NULL,
        longitude TEXT NOT NULL,
        hours TEXT,
        distance TEXT,
        phone TEXT,
        appointment_required BOOLEAN DEFAULT false
      );
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS submissions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        address TEXT NOT NULL,
        latitude TEXT NOT NULL,
        longitude TEXT NOT NULL,
        hours TEXT,
        photo_url TEXT,
        phone TEXT,
        appointment_required BOOLEAN DEFAULT false,
        submitted_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating tables:", error);
    process.exit(1);
  }
}

initDatabase();
