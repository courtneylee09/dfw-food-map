import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { Pool as PgPool } from 'pg';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// For development/testing without database, allow server to start
// The server uses MemStorage which doesn't require a database
if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set. Using in-memory storage (MemStorage). Database features will not work.");
}

// Determine if we're using Neon (serverless) or standard PostgreSQL (Railway)
const isNeonDb = process.env.DATABASE_URL?.includes('neon.tech');

export const pool = !process.env.DATABASE_URL 
  ? null as any
  : isNeonDb 
    ? new NeonPool({ connectionString: process.env.DATABASE_URL })
    : new PgPool({ connectionString: process.env.DATABASE_URL });

export const db = !process.env.DATABASE_URL
  ? null as any
  : isNeonDb
    ? drizzleNeon({ client: pool as NeonPool, schema })
    : drizzlePg({ client: pool as PgPool, schema });
