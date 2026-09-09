import { eq, like, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { roles } from "#/db/schema";

import type { CreateRoleInput, UpdateRoleInput } from "./schema";
import { normalizeRoleName } from "./shared";
import type { ListRolesOptions } from "./types";

export const DEFAULT_ROLES = ["Professor"] as const;

export async function createRole(db: DB, input: CreateRoleInput) {
	return db
		.insert(roles)
		.values({
			...input,
			id: crypto.randomUUID(),
		})
		.returning()
		.get();
}

export async function updateRole(db: DB, id: string, input: UpdateRoleInput) {
	return db.update(roles).set(input).where(eq(roles.id, id)).returning().get();
}

export async function findRoleById(db: DB, id: string) {
	return db.query.roles.findFirst({
		where: eq(roles.id, id),
	});
}

export async function findRoleByNormalizedName(
	db: DB,
	name: string,
): Promise<typeof roles.$inferSelect | undefined> {
	const normalized = normalizeRoleName(name);
	const candidates = await db.query.roles.findMany({ limit: 50 });
	return candidates.find((r) => normalizeRoleName(r.name) === normalized);
}

export async function listRoles(db: DB, options: ListRolesOptions = {}) {
	const { limit = 50, offset = 0, search } = options;
	const where = search
		? like(roles.name, sql`'%' || ${search} || '%'`)
		: undefined;

	return db.query.roles.findMany({
		where,
		limit,
		offset,
		orderBy: (roles, { desc }) => [desc(roles.createdAt)],
	});
}

export async function ensureDefaultRoles(db: DB) {
	for (const name of DEFAULT_ROLES) {
		const existing = await findRoleByNormalizedName(db, name);
		if (!existing) {
			await createRole(db, { name });
		}
	}
}
