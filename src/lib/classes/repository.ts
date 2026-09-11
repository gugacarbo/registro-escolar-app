import { and, eq, inArray, isNull, like, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { classes, enrollments } from "#/db/schema";

import type { CreateClassInput, UpdateClassInput } from "./schema";
import type { ClassListItem, ListClassesOptions } from "./types";

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

function buildClassesWhere(search?: string, academicPeriod?: string) {
	const conditions = [];
	const term = search?.trim();
	if (term) {
		conditions.push(like(classes.name, sql`'%' || ${term} || '%'`));
	}
	const period = academicPeriod?.trim();
	if (period) {
		conditions.push(eq(classes.academicPeriod, period));
	}
	if (conditions.length === 0) {
		return undefined;
	}
	return and(...conditions);
}

async function countActiveStudentsByClassIds(
	db: DB,
	classIds: string[],
): Promise<Map<string, number>> {
	const counts = new Map<string, number>();
	if (classIds.length === 0) {
		return counts;
	}
	const rows = await db.query.enrollments.findMany({
		where: and(
			inArray(enrollments.classId, classIds),
			eq(enrollments.status, "ativa"),
			isNull(enrollments.endDate),
		),
		columns: { classId: true },
	});
	for (const row of rows) {
		counts.set(row.classId, (counts.get(row.classId) ?? 0) + 1);
	}
	return counts;
}

export async function listAcademicPeriods(db: DB): Promise<string[]> {
	const rows = await db.query.classes.findMany({
		columns: { academicPeriod: true },
		orderBy: (classes, { asc }) => [asc(classes.academicPeriod)],
	});
	return [...new Set(rows.map((row) => row.academicPeriod))];
}

export async function listClasses(
	db: DB,
	options: ListClassesOptions = {},
): Promise<ClassListItem[]> {
	const { limit = 50, offset = 0, search, academicPeriod } = options;
	const where = buildClassesWhere(search, academicPeriod);

	const rows = await db.query.classes.findMany({
		where,
		limit,
		offset,
		orderBy: (classes, { desc }) => [desc(classes.createdAt)],
	});
	const counts = await countActiveStudentsByClassIds(
		db,
		rows.map((row) => row.id),
	);
	return rows.map((row) => ({
		...row,
		activeStudentCount: counts.get(row.id) ?? 0,
	}));
}

export async function countClasses(
	db: DB,
	options: Pick<ListClassesOptions, "search" | "academicPeriod"> = {},
) {
	return db.$count(
		classes,
		buildClassesWhere(options.search, options.academicPeriod),
	);
}
