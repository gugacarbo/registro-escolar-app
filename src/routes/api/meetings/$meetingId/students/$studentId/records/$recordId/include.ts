import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { findMeetingById } from "#/lib/meetings/repository";
import {
	ERR_MEETING_NOT_FOUND,
	ERR_MEETING_NOT_IN_PROGRESS,
	ERR_RECORD_NOT_FOUND,
	RecordNotFoundError,
	RecordNotLinkedToMeetingError,
} from "#/lib/records/errors";
import { setIndependentRecordInclusion } from "#/lib/records/repository";
import { setRecordInclusionSchema } from "#/lib/records/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/students/$studentId/records/$recordId/include",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			PATCH: setRecordInclusionHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

/** PATCH — decisão per-reunião de inclusão na ata (CA-009, borda 9). */
export async function setRecordInclusionHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { meetingId: string; studentId: string; recordId: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const body = (await request.json().catch(() => null)) as unknown;
	const parsed = setRecordInclusionSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const meeting = await findMeetingById(db, params.meetingId);
	if (!meeting) {
		return json({ error: ERR_MEETING_NOT_FOUND }, 404);
	}
	if (meeting.status !== "in_progress" && meeting.status !== "reopened") {
		return json(
			{ error: ERR_MEETING_NOT_IN_PROGRESS, meetingStatus: meeting.status },
			409,
		);
	}

	try {
		const inclusion = await setIndependentRecordInclusion(db, {
			recordId: params.recordId,
			meetingId: params.meetingId,
			include: parsed.data.incluir,
		});
		return json(inclusion, 200);
	} catch (error) {
		if (
			error instanceof RecordNotFoundError &&
			error.message === ERR_RECORD_NOT_FOUND
		) {
			return json({ error: ERR_RECORD_NOT_FOUND }, 404);
		}
		if (error instanceof RecordNotLinkedToMeetingError) {
			return json({ error: error.message }, 422);
		}
		throw error;
	}
}
