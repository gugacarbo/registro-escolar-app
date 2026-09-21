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
import { createMeetingParticipantApiSchema } from "#/lib/meetings/schema";
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
		roleIds?: unknown;
	};
	const parsed = createMeetingParticipantApiSchema.safeParse({
		staffId: body.staffId,
		roleId: body.roleId,
		roleIds: body.roleIds,
		meetingId: params.meetingId,
	});
	if (!parsed.success || !parsed.data.staffId) {
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

	const roles = [];
	for (const roleId of parsed.data.roleIds) {
		const role = await findRoleById(db, roleId);
		if (!role) {
			return json({ error: "Cargo não encontrado" }, 404);
		}
		roles.push(role);
	}

	const existing = [];
	for (const role of roles) {
		const participant = await findParticipant(
			db,
			params.meetingId,
			staffMember.id,
			role.id,
		);
		if (participant) existing.push(participant);
	}
	if (existing.length > 0) {
		return json(
			{ error: "Participante já adicionado", existing: existing[0] },
			409,
		);
	}

	const participants = [];
	for (const role of roles) {
		const participant = await createParticipant(db, {
			meetingId: params.meetingId,
			staffId: staffMember.id,
			roleId: role.id,
		});
		participants.push({ ...participant, staff: staffMember, role });
	}

	if (body.roleIds === undefined) return json(participants[0], 201);
	return json({ participants }, 201);
}
