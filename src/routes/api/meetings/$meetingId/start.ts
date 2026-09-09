import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	InvalidTransitionError,
	MeetingWithoutClassesError,
} from "#/lib/meetings/errors";
import { findMeetingById, transitionMeeting } from "#/lib/meetings/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/meetings/$meetingId/start")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			PATCH: startMeetingHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function startMeetingHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { meetingId: string };
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
		const started = await transitionMeeting(db, params.meetingId, "start");
		return json(started, 200);
	} catch (error) {
		// Borda 3: sem turmas não inicia (422); borda 5: transição
		// inválida (409).
		if (error instanceof MeetingWithoutClassesError) {
			return json({ error: error.message }, 422);
		}
		if (error instanceof InvalidTransitionError) {
			return json({ error: error.message }, 409);
		}
		throw error;
	}
}
