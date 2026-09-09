import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { findMeetingById } from "#/lib/meetings/repository";
import {
	ERR_INVALID_ORIGIN,
	ERR_MEETING_NOT_FOUND,
	ERR_MEETING_NOT_IN_PROGRESS,
	ERR_STUDENT_NOT_FOUND,
	InvalidOriginError,
	RecordNotFoundError,
} from "#/lib/records/errors";
import {
	createLinkedRecord,
	listStudentRecordsForMeeting,
} from "#/lib/records/repository";
import { createLinkedRecordSchema } from "#/lib/records/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/students/$studentId/records/",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listMeetingStudentRecordsHandler,
			POST: createLinkedRecordHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

/** GET — registros vinculados + independentes aplicáveis (bordas 7/8). */
export async function listMeetingStudentRecordsHandler({
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
	const db = createDb(requireD1(env));
	const meeting = await findMeetingById(db, params.meetingId);
	if (!meeting) {
		return json({ error: ERR_MEETING_NOT_FOUND }, 404);
	}
	const records = await listStudentRecordsForMeeting(db, {
		meetingId: params.meetingId,
		studentId: params.studentId,
	});
	return json({ records }, 200);
}

/** POST — cria registro vinculado à reunião (CA-003, bordas 2/5). */
export async function createLinkedRecordHandler({
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

	const body = (await request.json().catch(() => null)) as unknown;
	const parsed = createLinkedRecordSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const meeting = await findMeetingById(db, params.meetingId);
	if (!meeting) {
		return json({ error: ERR_MEETING_NOT_FOUND }, 404);
	}
	// Borda 5: só Em andamento/Reaberta aceita registros vinculados.
	if (meeting.status !== "in_progress" && meeting.status !== "reopened") {
		return json(
			{ error: ERR_MEETING_NOT_IN_PROGRESS, meetingStatus: meeting.status },
			409,
		);
	}

	try {
		const record = await createLinkedRecord(db, {
			meetingId: params.meetingId,
			studentId: params.studentId,
			texto: parsed.data.texto,
			categoriaId: parsed.data.categoriaId ?? null,
			componenteId: parsed.data.componenteId ?? null,
			origemId: parsed.data.origemId ?? null,
			incluirNaAta: parsed.data.incluirNaAta ?? true,
		});
		return json(record, 201);
	} catch (error) {
		if (
			error instanceof RecordNotFoundError &&
			error.message === ERR_STUDENT_NOT_FOUND
		) {
			return json({ error: ERR_STUDENT_NOT_FOUND }, 404);
		}
		if (error instanceof InvalidOriginError) {
			// Borda 2: autoria inválida (CA-005).
			return json({ error: ERR_INVALID_ORIGIN }, 422);
		}
		throw error;
	}
}
