import { eq, like, or, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { students } from "#/db/schema";

import type { CreateStudentInput, UpdateStudentInput } from "./schema";
import type { ListStudentsOptions } from "./types";

export async function createStudent(db: DB, input: CreateStudentInput) {
	return db
		.insert(students)
		.values({
			...input,
			id: crypto.randomUUID(),
		})
		.returning()
		.get();
}

export async function updateStudent(
	db: DB,
	id: string,
	input: UpdateStudentInput,
) {
	return db
		.update(students)
		.set(input)
		.where(eq(students.id, id))
		.returning()
		.get();
}

export async function findStudentById(db: DB, id: string) {
	return db.query.students.findFirst({
		where: eq(students.id, id),
	});
}

export async function findStudentsByNameOrDocument(
	db: DB,
	{ name, document }: { name?: string; document?: string },
) {
	const conditions = [];
	if (name) {
		conditions.push(eq(students.name, name));
	}
	if (document) {
		conditions.push(eq(students.document, document));
	}
	if (conditions.length === 0) {
		return [];
	}
	return db.query.students.findMany({
		where: or(...conditions),
		limit: 10,
	});
}

export async function listStudents(db: DB, options: ListStudentsOptions = {}) {
	const { limit = 50, offset = 0, search } = options;
	const where = search
		? or(
				like(students.name, sql`'%' || ${search} || '%'`),
				like(students.document, sql`'%' || ${search} || '%'`),
			)
		: undefined;

	return db.query.students.findMany({
		where,
		limit,
		offset,
		orderBy: (students, { desc }) => [desc(students.createdAt)],
	});
}
