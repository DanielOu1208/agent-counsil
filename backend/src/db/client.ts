import dns from "node:dns";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

// Force IPv4 — many networks can't reach Supabase over IPv6
dns.setDefaultResultOrder("ipv4first");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(DATABASE_URL);
export const db = drizzle(client, { schema });
