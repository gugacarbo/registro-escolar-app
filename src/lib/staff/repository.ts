import { and, eq, isNull, like, or, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { staff } from "#/db/schema";
import type { CreateStaffInput, UpdateStaffInput } from "./schema";
import { normalizeStaffName } from "./shared";
import type { ListStaffOptions } from "./types";

export async function createStaff(db: DB, input: CreateStaffInput) {
	return db
		.insert(staff)
		.values({
			...input,
			id: crypto.randomUUID(),
		})
		.returning()
		.get();
}

export async function updateStaff(db: DB, id: string, input: UpdateStaffInput) {
	return db.update(staff).set(input).where(eq(staff.id, id)).returning().get();
}

export async function findStaffById(db: DB, id: string) {
	return db.query.staff.findFirst({
		where: eq(staff.id, id),
	});
}

export async function findActiveStaffById(db: DB, id: string) {
	return db.query.staff.findFirst({
		where: and(eq(staff.id, id), isNull(staff.deletedAt)),
	});
}

export async function findStaffByName(db: DB, name: string) {
	const exact = await db.query.staff.findMany({
		where: and(eq(staff.name, name), isNull(staff.deletedAt)),
		limit: 10,
	});
	if (exact.length > 0) return exact;

	const normalized = normalizeStaffName(name);
	const active = await db.query.staff.findMany({
		where: isNull(staff.deletedAt),
		limit: 200,
	});
	return active.filter(
		(member) => normalizeStaffName(member.name) === normalized,
	);
}

export async function listStaff(db: DB, options: ListStaffOptions = {}) {
	const { limit = 50, offset = 0, search } = options;
	const active = isNull(staff.deletedAt);
	const where = search
		? and(
				active,
				or(
					like(staff.name, sql`'%' || ${search} || '%'`),
					like(staff.email, sql`'%' || ${search} || '%'`),
				),
			)
		: active;

	return db.query.staff.findMany({
		where,
		limit,
		offset,
		orderBy: (staff, { desc }) => [desc(staff.createdAt)],
	});
}

export async function softDeleteStaff(db: DB, id: string) {
	return db
		.update(staff)
		.set({ deletedAt: new Date() })
		.where(eq(staff.id, id))
		.returning()
		.get();
}
