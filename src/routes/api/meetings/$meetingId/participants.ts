import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	createParticipant,
	findMeetingById,
	findParticipant,
	listParticipantsByMeeting,
} from "#/lib/meetings/repository";
import { createMeetingParticipantSchema } from "#/lib/meetings/schema";
import { findRoleById } from "#/lib/roles/repository";
import { findActiveStaffById } from "#/lib/staff/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/meetings/$meetingId/participants")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listParticipantsHandler,
			POST: createParticipantHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function listParticipantsHandler({
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

	const participants = await listParticipantsByMeeting(db, params.meetingId);
	return json(participants, 200);
}

export async function createParticipantHandler({
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

	const body = (await request.json()) as {
		staffId?: unknown;
		roleId?: unknown;
	};
	const parsed = createMeetingParticipantSchema.safeParse({
		staffId: body.staffId,
		roleId: body.roleId,
		meetingId: params.meetingId,
	});
	if (!parsed.success || !parsed.data.staffId || !parsed.data.roleId) {
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

	const staffMember = await findActiveStaffById(db, parsed.data.staffId);
	if (!staffMember) {
		return json({ error: "Servidor não encontrado" }, 404);
	}

	const role = await findRoleById(db, parsed.data.roleId);
	if (!role) {
		return json({ error: "Papel não encontrado" }, 404);
	}

	const existing = await findParticipant(db, params.meetingId, staffMember.id);
	if (existing) {
		return json({ error: "Participante já adicionado", existing }, 409);
	}

	const participant = await createParticipant(db, {
		meetingId: params.meetingId,
		staffId: staffMember.id,
		roleId: role.id,
	});
	return json({ ...participant, staff: staffMember, role }, 201);
}
