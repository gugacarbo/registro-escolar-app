import { and, eq, lte, sql } from "drizzle-orm";

import type { DB } from "#/db";
import { enrollments } from "#/db/schema";

import { previousDay } from "./dates";
import type { CreateEnrollmentInput } from "./schema";

export type EnrollmentRow = typeof enrollments.$inferSelect;

function isActiveOn(dateMs: number) {
	return and(
		lte(enrollments.startDate, new Date(dateMs)),
		sql`(${enrollments.endDate} IS NULL OR ${enrollments.endDate} >= ${dateMs})`,
	);
}

export async function findOverlappingEnrollment(
	db: DB,
	{
		studentId,
		classId,
		start,
		end,
	}: {
		studentId: string;
		classId: string;
		start: Date;
		end: Date | null;
	},
) {
	const existing = await db.query.enrollments.findMany({
		where: and(
			eq(enrollments.studentId, studentId),
			eq(enrollments.classId, classId),
		),
	});
	return existing.find((row) => {
		const startsBeforeExistingEnd =
			row.endDate === null || start <= row.endDate;
		const endsAfterExistingStart = end === null || end >= row.startDate;
		return startsBeforeExistingEnd && endsAfterExistingStart;
	});
}

export async function findActiveEnrollmentsOfStudent(
	db: DB,
	studentId: string,
	date: Date,
) {
	return db.query.enrollments.findMany({
		where: and(
			eq(enrollments.studentId, studentId),
			isActiveOn(date.getTime()),
		),
	});
}

export async function closeEnrollment(
	db: DB,
	id: string,
	endDate: Date,
	status: string,
) {
	return db
		.update(enrollments)
		.set({ endDate, status })
		.where(eq(enrollments.id, id))
		.returning()
		.get();
}

export async function createEnrollmentWithTransfer(
	db: DB,
	input: CreateEnrollmentInput,
) {
	const start = input.startDate;
	const end = input.endDate ?? null;

	const conflict = await findOverlappingEnrollment(db, {
		studentId: input.studentId,
		classId: input.classId,
		start,
		end,
	});
	if (conflict) {
		return { conflict };
	}

	// D1 não expõe .transaction(): operações sequenciais. A sobreposição na
	// mesma turma foi validada acima e o handler responde 409 em conflito.
	const activeOthers = (
		await findActiveEnrollmentsOfStudent(db, input.studentId, start)
	).filter((row) => row.classId !== input.classId);

	const closedEnrollments: EnrollmentRow[] = [];
	for (const row of activeOthers) {
		const closed = await closeEnrollment(
			db,
			row.id,
			new Date(previousDay(start.getTime())),
			"transferida",
		);
		closedEnrollments.push(closed);
	}

	const [enrollment] = await db
		.insert(enrollments)
		.values({ ...input, id: crypto.randomUUID() })
		.returning();

	return { enrollment, closedEnrollments };
}

export async function listStudentsByClassAtDate(
	db: DB,
	classId: string,
	date: Date,
) {
	const dateMs = date.getTime();
	const memberships = await db.query.enrollments.findMany({
		with: { student: true },
		where: and(
			eq(enrollments.classId, classId),
			lte(enrollments.startDate, new Date(dateMs)),
			sql`(${enrollments.endDate} IS NULL OR ${enrollments.endDate} >= ${dateMs})`,
		),
	});
	return memberships.map(({ student, ...enrollment }) => ({
		student,
		enrollment,
	}));
}
