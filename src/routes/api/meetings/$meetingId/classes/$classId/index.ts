import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	MeetingClassInUseError,
	MeetingNotEditableError,
} from "#/lib/meetings/errors";
import { findMeetingById, removeMeetingClass } from "#/lib/meetings/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/classes/$classId/",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			DELETE: removeMeetingClassHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

/** DELETE — desvincula turma da reunião (spec 0005, bordas 9/10). */
export async function removeMeetingClassHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { meetingId: string; classId: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const db = createDb(requireD1(env));
	const meeting = await findMeetingById(db, params.meetingId);
	if (!meeting) {
		return json({ error: "Reunião não encontrada" }, 404);
	}

	try {
		await removeMeetingClass(db, params.meetingId, params.classId);
		return json({ ok: true }, 200);
	} catch (error) {
		if (error instanceof MeetingClassInUseError) {
			return json({ error: error.message }, 409);
		}
		if (error instanceof MeetingNotEditableError) {
			return json({ error: error.message }, 409);
		}
		throw error;
	}
}
