import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { findClassById } from "#/lib/classes/repository";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { mapEnrollmentRequestToRow } from "#/lib/enrollments/mapping";
import { createEnrollmentWithTransfer } from "#/lib/enrollments/repository";
import { createEnrollmentSchema } from "#/lib/enrollments/schema";
import { findStudentById } from "#/lib/students/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/enrollments/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			POST: createEnrollmentHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function createEnrollmentHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const body = (await request.json()) as Record<string, unknown>;
	const parsed = createEnrollmentSchema.safeParse(
		mapEnrollmentRequestToRow(body),
	);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const student = await findStudentById(db, parsed.data.studentId);
	if (!student) {
		return json({ error: "Estudante não encontrado" }, 404);
	}
	const classRow = await findClassById(db, parsed.data.classId);
	if (!classRow) {
		return json({ error: "Turma não encontrada" }, 404);
	}

	const result = await createEnrollmentWithTransfer(db, parsed.data);
	if ("conflict" in result) {
		return json(
			{
				error: "Vínculo sobreposto para o mesmo estudante nesta turma",
				conflictingEnrollment: result.conflict,
			},
			409,
		);
	}
	return json(result, 201);
}
