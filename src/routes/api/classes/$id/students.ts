import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { findClassById } from "#/lib/classes/repository";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	dateStringToTimestamp,
	isDateString,
	timestampToDateString,
} from "#/lib/enrollments/dates";
import { listStudentsByClassAtDate } from "#/lib/enrollments/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/classes/$id/students")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listClassStudentsHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function listClassStudentsHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { id: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const url = new URL(request.url);
	const dateParam = url.searchParams.get("date");
	if (!dateParam || !isDateString(dateParam)) {
		return json(
			{ error: "Parâmetro date é obrigatório no formato YYYY-MM-DD" },
			400,
		);
	}

	const db = createDb(requireD1(env));
	const classRow = await findClassById(db, params.id);
	if (!classRow) {
		return json({ error: "Turma não encontrada" }, 404);
	}

	const date = new Date(dateStringToTimestamp(dateParam));
	const rows = await listStudentsByClassAtDate(db, params.id, date);
	return json(
		rows.map(({ student, enrollment }) => ({
			student,
			enrollment: {
				id: enrollment.id,
				startDate: timestampToDateString(enrollment.startDate.getTime()),
				endDate: enrollment.endDate
					? timestampToDateString(enrollment.endDate.getTime())
					: null,
				status: enrollment.status,
			},
		})),
		200,
	);
}
