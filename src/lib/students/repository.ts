import { and, eq, inArray, isNull, like, or, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { enrollments, students } from "#/db/schema";

import type { CreateStudentInput, UpdateStudentInput } from "./schema";
import type {
	ListStudentsOptions,
	StudentDetail,
	StudentWithTurmas,
} from "./types";

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

export async function findStudentDetail(
	db: DB,
	id: string,
): Promise<StudentDetail | null> {
	const student = await findStudentById(db, id);
	if (!student) {
		return null;
	}
	const rows = await db.query.enrollments.findMany({
		where: eq(enrollments.studentId, id),
		with: { class: true },
		orderBy: (row, { desc }) => [desc(row.startDate)],
	});
	return {
		...student,
		matriculas: rows.map((row) => ({
			id: row.classId,
			name: row.class.name,
			startDate: row.startDate.toISOString(),
			endDate: row.endDate ? row.endDate.toISOString() : null,
			status: row.status,
		})),
	};
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

function buildStudentsWhere(search?: string, classId?: string) {
	const term = search?.trim();
	const conditions = [];
	if (term) {
		conditions.push(
			or(
				like(students.name, sql`'%' || ${term} || '%'`),
				like(students.document, sql`'%' || ${term} || '%'`),
			),
		);
	}
	if (classId) {
		conditions.push(
			inArray(
				students.id,
				sql`(SELECT student_id FROM enrollments WHERE class_id = ${classId} AND end_date IS NULL)`,
			),
		);
	}
	if (conditions.length === 0) {
		return undefined;
	}
	return and(...conditions);
}

function activeTurmasCondition() {
	return isNull(enrollments.endDate);
}

async function fetchTurmasByStudent(
	db: DB,
	studentIds: string[],
): Promise<Map<string, { id: string; name: string }[]>> {
	const map = new Map<string, { id: string; name: string }[]>();
	if (studentIds.length === 0) {
		return map;
	}
	const rows = await db.query.enrollments.findMany({
		where: and(
			inArray(enrollments.studentId, studentIds),
			activeTurmasCondition(),
		),
		orderBy: (enrollment, { asc }) => [asc(enrollment.startDate)],
		with: { class: true },
	});
	for (const row of rows) {
		const list = map.get(row.studentId) ?? [];
		list.push({ id: row.classId, name: row.class.name });
		map.set(row.studentId, list);
	}
	return map;
}

export async function listStudents(
	db: DB,
	options: ListStudentsOptions = {},
): Promise<StudentWithTurmas[]> {
	const { limit = 50, offset = 0, search, classId } = options;
	const where = buildStudentsWhere(search, classId);

	const rows = await db.query.students.findMany({
		where,
		limit,
		offset,
		orderBy: (students, { desc }) => [desc(students.createdAt)],
	});
	const turmasByStudent = await fetchTurmasByStudent(
		db,
		rows.map((row) => row.id),
	);
	return rows.map((row) => ({
		...row,
		turmas: turmasByStudent.get(row.id) ?? [],
	}));
}

export async function countStudents(
	db: DB,
	options: Pick<ListStudentsOptions, "search" | "classId"> = {},
) {
	const where = buildStudentsWhere(options.search, options.classId);
	return db.$count(students, where);
}
