import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { ERR_MEETING_CLOSED } from "#/lib/meetings/errors";
import { findMeetingById, updateMeeting } from "#/lib/meetings/repository";
import type { UpdateMeetingInput } from "#/lib/meetings/schema";
import { updateMeetingSchema } from "#/lib/meetings/schema";
import { canEditMeetingData } from "#/lib/meetings/transitions";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/meetings/$meetingId/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: getMeetingHandler,
			PATCH: updateMeetingHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function getMeetingHandler({
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
	return json(meeting, 200);
}

export async function updateMeetingHandler({
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

	const body = (await request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	if (!body) {
		return json({ error: "Dados inválidos" }, 400);
	}
	// Aceita data ISO (input date da UI) convertendo para Date.
	if (typeof body.heldAt === "string" && body.heldAt.length > 0) {
		body.heldAt = new Date(body.heldAt);
	}
	if (!body) {
		return json({ error: "Dados inválidos" }, 400);
	}
	const parsed = updateMeetingSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const meeting = await findMeetingById(db, params.meetingId);
	if (!meeting) {
		return json({ error: "Reunião não encontrada" }, 404);
	}
	// Dados gerais editáveis apenas com a reunião aberta (spec 0005, borda 1).
	// Turmas têm rotas próprias (POST/DELETE /api/meetings/:id/classes).
	if (!canEditMeetingData(meeting.status)) {
		return json({ error: ERR_MEETING_CLOSED }, 409);
	}

	const update: UpdateMeetingInput = {};
	if (parsed.data.title !== undefined) update.title = parsed.data.title;
	if (parsed.data.heldAt !== undefined) update.heldAt = parsed.data.heldAt;
	if (parsed.data.templateId !== undefined) {
		update.templateId = parsed.data.templateId;
	}
	const updated = await updateMeeting(db, params.meetingId, update);
	return json(updated, 200);
}
