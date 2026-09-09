import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { InvalidTransitionError } from "#/lib/meetings/errors";
import { findMeetingById, transitionMeeting } from "#/lib/meetings/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/meetings/$meetingId/reopen")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			PATCH: reopenMeetingHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function reopenMeetingHandler({
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
		const reopened = await transitionMeeting(db, params.meetingId, "reopen");
		// Dica de próximo passo do ciclo de vida (spec 0005):
		// Finalizada → Reaberta → Em andamento → Finalizada.
		return json(
			{ ...reopened, hint: "Use start para voltar a em andamento" },
			200,
		);
	} catch (error) {
		if (error instanceof InvalidTransitionError) {
			return json({ error: error.message }, 409);
		}
		throw error;
	}
}
