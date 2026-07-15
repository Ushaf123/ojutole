import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { env } from "../lib/env";
import * as schema from "@db/schema";

const fullSchema = { ...schema };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;

export function getDb() {
  if (!instance) {
    const dbPath = env.databaseUrl?.startsWith("file:")
      ? env.databaseUrl.replace("file:", "")
      : env.databaseUrl || "./local.db";
    const client = new Database(dbPath);
    instance = drizzle(client, { schema: fullSchema });
  }
  return instance;
}
