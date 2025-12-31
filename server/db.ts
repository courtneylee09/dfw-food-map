import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// For development/testing without database, allow server to start
// The server uses MemStorage which doesn't require a database
if (!process.env.DATABASE_URL) {
  console.warn("⚠️  DATABASE_URL not set. Using in-memory storage (MemStorage). Database features will not work.");
}

export const pool = process.env.DATABASE_URL 
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null as any;

export const db = process.env.DATABASE_URL
  ? drizzle({ client: pool as Pool, schema })
  : null as any;
