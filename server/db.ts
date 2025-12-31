import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// For development/testing without database, allow server to start
if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set. Using in-memory storage (MemStorage). Database features will not work.");
} else {
  console.log("✓ DATABASE_URL is set, connecting to PostgreSQL database");
}

export const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null as any;

export const db = process.env.DATABASE_URL
  ? drizzle(pool, { schema })
  : null as any;
