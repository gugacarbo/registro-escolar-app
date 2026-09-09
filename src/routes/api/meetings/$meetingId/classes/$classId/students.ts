import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	isClassLinkedToMeeting,
	listStudentsWithStatus,
} from "#/lib/meeting-student-status/repository";
import { findMeetingById } from "#/lib/meetings/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/classes/$classId/students",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listMeetingClassStudentsHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function listMeetingClassStudentsHandler({
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

	const linked = await isClassLinkedToMeeting(
		db,
		params.meetingId,
		params.classId,
	);
	if (!linked) {
		return json({ error: "Turma não vinculada a esta reunião" }, 404);
	}

	const dateMs = (meeting.heldAt ?? meeting.createdAt).getTime();
	const result = await listStudentsWithStatus(db, {
		meetingId: params.meetingId,
		classId: params.classId,
		dateMs,
	});
	return json(result, 200);
}
