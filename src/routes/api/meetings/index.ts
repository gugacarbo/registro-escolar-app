import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { findClassById } from "#/lib/classes/repository";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	createMeetingWithRelations,
	listMeetings,
} from "#/lib/meetings/repository";
import {
	createMeetingApiSchema,
	meetingStatusSchema,
} from "#/lib/meetings/schema";
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
	const search = url.searchParams.get("search") ?? undefined;
	const statusParam = url.searchParams.get("status");
	const status = statusParam
		? meetingStatusSchema.safeParse(statusParam).success
			? (statusParam as "draft" | "in_progress" | "finished" | "reopened")
			: undefined
		: undefined;
	const limit = Number(url.searchParams.get("limit") ?? "50");
	const offset = Number(url.searchParams.get("offset") ?? "0");

	const db = createDb(requireD1(env));
	const meetings = await listMeetings(db, {
		search,
		status,
		limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 50,
		offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
	});
	return json(meetings, 200);
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

	const body = (await request.json()) as Record<string, unknown>;
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
		const role = await findRoleById(db, participant.roleId);
		if (!role) {
			return json({ error: "Papel não encontrado" }, 404);
		}
	}

	// templateId é pass-through (sem tabela de templates até a spec 0009).
	// A reunião nasce sempre como rascunho (spec 0005).
	const meeting = await createMeetingWithRelations(db, {
		title: parsed.data.title,
		heldAt: parsed.data.heldAt ?? null,
		templateId: parsed.data.templateId ?? null,
		classIds: parsed.data.classIds,
		participants: parsed.data.participants,
	});
	return json(meeting, 201);
}
