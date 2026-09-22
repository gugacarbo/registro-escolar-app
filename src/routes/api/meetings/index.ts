import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { findClassById } from "#/lib/classes/repository";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	countMeetings,
	createMeetingWithRelations,
	listMeetings,
} from "#/lib/meetings/repository";
import {
	createMeetingApiSchema,
	meetingStatusSchema,
} from "#/lib/meetings/schema";
import { parsePageParams } from "#/lib/pagination";
import { findRoleById } from "#/lib/roles/repository";
import { findActiveStaffById } from "#/lib/staff/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/meetings/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listMeetingsHandler,
			POST: createMeetingHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function listMeetingsHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const url = new URL(request.url);
	const { page, pageSize, limit, offset, search } = parsePageParams(
		url.searchParams,
	);
	const statusParam = url.searchParams.get("status");
	const status = statusParam
		? meetingStatusSchema.safeParse(statusParam).success
			? (statusParam as "open" | "closed")
			: undefined
		: undefined;

	const db = createDb(requireD1(env));
	const [meetings, total] = await Promise.all([
		listMeetings(db, { search, status, limit, offset }),
		countMeetings(db, { search, status }),
	]);
	return json({ data: meetings, total, page, pageSize }, 200);
}

export async function createMeetingHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
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
	const parsed = createMeetingApiSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	for (const classId of parsed.data.classIds) {
		const linkedClass = await findClassById(db, classId);
		if (!linkedClass) {
			return json({ error: "Turma não encontrada" }, 404);
		}
	}
	for (const participant of parsed.data.participants) {
		const staffMember = await findActiveStaffById(db, participant.staffId);
		if (!staffMember) {
			return json({ error: "Servidor não encontrado" }, 404);
		}
		for (const roleId of participant.roleIds) {
			const role = await findRoleById(db, roleId);
			if (!role) {
				return json({ error: "Cargo não encontrado" }, 404);
			}
		}
	}

	// A reunião nasce sempre aberta (spec 0005).
	const meeting = await createMeetingWithRelations(db, {
		title: parsed.data.title,
		heldAt: parsed.data.heldAt ?? null,
		templateId: parsed.data.templateId ?? null,
		classIds: parsed.data.classIds,
		participants: parsed.data.participants,
	});
	return json(meeting, 201);
}
