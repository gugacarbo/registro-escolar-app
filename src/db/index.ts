import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { drizzle } from "drizzle-orm/d1";

import * as schema from "./schema";

export function createDb(d1: D1Database) {
	return drizzle(d1, { schema });
}

export type DB =
	| DrizzleD1Database<typeof schema>
	| BetterSQLite3Database<typeof schema>;
