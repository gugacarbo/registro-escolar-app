import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	isStudentEnrolledInClassAtDate,
	upsertStudentStatus,
} from "#/lib/meeting-student-status/repository";
import { updateStudentStatusSchema } from "#/lib/meeting-student-status/schema";
import { findMeetingById } from "#/lib/meetings/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/students/$studentId/status",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			PATCH: updateStudentStatusHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function updateStudentStatusHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { meetingId: string; studentId: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const body = (await request.json().catch(() => null)) as {
		status?: unknown;
		classId?: unknown;
	} | null;
	const parsed = updateStudentStatusSchema.safeParse({
		status: body?.status,
		classId: body?.classId,
	});
	if (!parsed.success || !parsed.data.classId) {
		return json(
			{
				error: "Dados inválidos",
				issues: parsed.success ? [] : parsed.error.issues,
			},
			400,
		);
	}

	const db = createDb(requireD1(env));
	const meeting = await findMeetingById(db, params.meetingId);
	if (!meeting) {
		return json({ error: "Reunião não encontrada" }, 404);
	}

	if (meeting.status !== "open") {
		return json(
			{
				error: "Reunião encerrada: reabra para editar o acompanhamento",
				meetingStatus: meeting.status,
			},
			409,
		);
	}

	const dateMs = (meeting.heldAt ?? meeting.createdAt).getTime();
	const enrolled = await isStudentEnrolledInClassAtDate(db, {
		studentId: params.studentId,
		classId: parsed.data.classId,
		dateMs,
	});
	if (!enrolled) {
		return json(
			{ error: "Estudante não vinculado à turma na data da reunião" },
			422,
		);
	}

	const status = await upsertStudentStatus(db, {
		meetingId: params.meetingId,
		classId: parsed.data.classId,
		studentId: params.studentId,
		status: parsed.data.status,
	});
	return json(status, 200);
}
