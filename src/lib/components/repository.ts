import { eq, like, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { components } from "#/db/schema";

import { normalizeName } from "#/lib/students/shared";

import type { CreateComponentInput } from "./schema";

export async function createComponent(db: DB, input: CreateComponentInput) {
	return db
		.insert(components)
		.values({
			...input,
			id: crypto.randomUUID(),
		})
		.returning()
		.get();
}

export async function findComponentById(db: DB, id: string) {
	return db.query.components.findFirst({
		where: eq(components.id, id),
	});
}

/** Borda 1: detecta componente duplicado normalizando acentos/caça/espaços. */
export async function findComponentByNormalizedName(
	db: DB,
	name: string,
): Promise<typeof components.$inferSelect | undefined> {
	const normalized = normalizeName(name);
	const candidates = await db.query.components.findMany({ limit: 200 });
	return candidates.find((c) => normalizeName(c.name) === normalized);
}

export async function listComponents(
	db: DB,
	options: { limit?: number; offset?: number; search?: string } = {},
) {
	const { limit = 50, offset = 0, search } = options;
	const where = search
		? like(components.name, sql`'%' || ${search} || '%'`)
		: undefined;

	return db.query.components.findMany({
		where,
		limit,
		offset,
		orderBy: (components, { desc }) => [desc(components.createdAt)],
	});
}
