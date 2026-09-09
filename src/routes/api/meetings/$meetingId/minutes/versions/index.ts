import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	MeetingNotFoundError,
	MinuteNotFoundError,
} from "#/lib/minutes/errors";
import { listMinuteVersions } from "#/lib/minutes/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute(
	"/api/meetings/$meetingId/minutes/versions/",
)({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listMinuteVersionsHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function listMinuteVersionsHandler({
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
	try {
		return json(await listMinuteVersions(db, params.meetingId), 200);
	} catch (error) {
		if (
			error instanceof MinuteNotFoundError ||
			error instanceof MeetingNotFoundError
		) {
			return json({ error: error.message }, 404);
		}
		throw error;
	}
}
