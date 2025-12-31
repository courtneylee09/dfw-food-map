import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// For development/testing without database, allow server to start
if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set. Using in-memory storage (MemStorage). Database features will not work.");
} else {
  console.log("✓ DATABASE_URL is set, connecting to PostgreSQL database");
}

// Configure pool with SSL support for production databases
const poolConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false
    }
  : null;

export const pool = poolConfig 
  ? new Pool(poolConfig)
  : null as any;

export const db = pool
  ? drizzle(pool, { schema })
  : null as any;
