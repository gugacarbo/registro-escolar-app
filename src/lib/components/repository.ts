import { eq, like, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { components } from "#/db/schema";

import { normalizeName } from "#/lib/students/shared";

import type { CreateComponentInput } from "./schema";
import type { ListComponentsOptions } from "./types";

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

function buildComponentsWhere(search?: string) {
	const term = search?.trim();
	if (!term) {
		return undefined;
	}
	return like(components.name, sql`'%' || ${term} || '%'`);
}

export async function listComponents(
	db: DB,
	options: ListComponentsOptions = {},
) {
	const { limit = 50, offset = 0, search } = options;

	return db.query.components.findMany({
		where: buildComponentsWhere(search),
		limit,
		offset,
		orderBy: (components, { desc }) => [desc(components.createdAt)],
	});
}

export async function countComponents(
	db: DB,
	options: Pick<ListComponentsOptions, "search"> = {},
) {
	return db.$count(components, buildComponentsWhere(options.search));
}
