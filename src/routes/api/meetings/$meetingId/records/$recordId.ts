import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { findMeetingById } from "#/lib/meetings/repository";
import {
	ERR_INVALID_ORIGIN,
	ERR_MEETING_NOT_FOUND,
	ERR_MEETING_NOT_IN_PROGRESS,
	ERR_RECORD_NOT_FOUND,
	ERR_RECORD_NOT_LINKED_TO_MEETING,
	InvalidOriginError,
	RecordNotFoundError,
	RecordNotLinkedToMeetingError,
} from "#/lib/records/errors";
import { updateLinkedRecord } from "#/lib/records/repository";
import { updateLinkedRecordSchema } from "#/lib/records/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/records/$recordId",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			PATCH: updateLinkedRecordHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

/** PATCH — edita registro vinculado (bordas 2/5). */
export async function updateLinkedRecordHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { meetingId: string; recordId: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const body = (await request.json().catch(() => null)) as unknown;
	const parsed = updateLinkedRecordSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const meeting = await findMeetingById(db, params.meetingId);
	if (!meeting) {
		return json({ error: ERR_MEETING_NOT_FOUND }, 404);
	}
	// Borda 5: edição só com reunião Em andamento/Reaberta.
	if (meeting.status !== "in_progress" && meeting.status !== "reopened") {
		return json(
			{ error: ERR_MEETING_NOT_IN_PROGRESS, meetingStatus: meeting.status },
			409,
		);
	}

	try {
		const record = await updateLinkedRecord(db, {
			meetingId: params.meetingId,
			recordId: params.recordId,
			texto: parsed.data.texto,
			categoriaId: parsed.data.categoriaId ?? null,
			componenteId: parsed.data.componenteId ?? null,
			origemId: parsed.data.origemId ?? null,
			incluirNaAta: parsed.data.incluirNaAta ?? undefined,
		});
		return json(record, 200);
	} catch (error) {
		if (
			error instanceof RecordNotFoundError &&
			error.message === ERR_RECORD_NOT_FOUND
		) {
			return json({ error: ERR_RECORD_NOT_FOUND }, 404);
		}
		if (error instanceof RecordNotLinkedToMeetingError) {
			return json({ error: ERR_RECORD_NOT_LINKED_TO_MEETING }, 409);
		}
		if (error instanceof InvalidOriginError) {
			return json({ error: ERR_INVALID_ORIGIN }, 422);
		}
		throw error;
	}
}
