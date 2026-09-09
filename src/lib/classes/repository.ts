import { eq, like, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { classes } from "#/db/schema";

import type { CreateClassInput, UpdateClassInput } from "./schema";
import type { ListClassesOptions } from "./types";

export async function createClass(db: DB, input: CreateClassInput) {
	return db
		.insert(classes)
		.values({
			...input,
			id: crypto.randomUUID(),
		})
		.returning()
		.get();
}

export async function updateClass(db: DB, id: string, input: UpdateClassInput) {
	return db
		.update(classes)
		.set(input)
		.where(eq(classes.id, id))
		.returning()
		.get();
}

export async function findClassById(db: DB, id: string) {
	return db.query.classes.findFirst({
		where: eq(classes.id, id),
	});
}

export async function listClasses(db: DB, options: ListClassesOptions = {}) {
	const { limit = 50, offset = 0, search } = options;
	const where = search
		? like(classes.name, sql`'%' || ${search} || '%'`)
		: undefined;

	return db.query.classes.findMany({
		where,
		limit,
		offset,
		orderBy: (classes, { desc }) => [desc(classes.createdAt)],
	});
}
