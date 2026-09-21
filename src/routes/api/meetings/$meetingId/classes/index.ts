import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { findClassById } from "#/lib/classes/repository";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	MeetingClassAlreadyLinkedError,
	MeetingNotEditableError,
} from "#/lib/meetings/errors";
import { addMeetingClass, findMeetingById } from "#/lib/meetings/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/meetings/$meetingId/classes/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listMeetingClassesHandler,
			POST: addMeetingClassHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function listMeetingClassesHandler({
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
	const rows = await db.query.meetingClasses.findMany({
		where: (row, { eq }) => eq(row.meetingId, params.meetingId),
		with: { class: true },
		orderBy: (row, { asc }) => [asc(row.createdAt)],
	});
	return json(
		rows.map((row) => ({
			...row,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		})),
		200,
	);
}

/** POST — vincula turma à reunião (spec 0005, borda 8). */
export async function addMeetingClassHandler({
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

	const body = (await request.json().catch(() => null)) as {
		classId?: unknown;
	} | null;
	const classId = typeof body?.classId === "string" ? body.classId : "";
	if (!classId) {
		return json({ error: "Dados inválidos" }, 400);
	}

	const db = createDb(requireD1(env));
	const meeting = await findMeetingById(db, params.meetingId);
	if (!meeting) {
		return json({ error: "Reunião não encontrada" }, 404);
	}
	const linkedClass = await findClassById(db, classId);
	if (!linkedClass) {
		return json({ error: "Turma não encontrada" }, 404);
	}

	try {
		const link = await addMeetingClass(db, params.meetingId, classId);
		return json({ ...link, class: linkedClass }, 201);
	} catch (error) {
		if (error instanceof MeetingClassAlreadyLinkedError) {
			return json({ error: error.message }, 409);
		}
		if (error instanceof MeetingNotEditableError) {
			return json({ error: error.message }, 409);
		}
		throw error;
	}
}
