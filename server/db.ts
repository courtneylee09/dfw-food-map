import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// For development/testing without database, allow server to start
if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set. Using in-memory storage (MemStorage). Database features will not work.");
} else {
  console.log("✓ DATABASE_URL is set:", process.env.DATABASE_URL.substring(0, 20) + "...");
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

// Add error handler to prevent crashes
if (pool) {
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });
}

export const db = pool
  ? drizzle(pool, { schema })
  : null as any;
