import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { findClassById, updateClass } from "#/lib/classes/repository";
import { updateClassSchema } from "#/lib/classes/schema";
import { mapClassRequestToRow } from "#/lib/enrollments/mapping";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/classes/$id/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: getClassHandler,
			PATCH: updateClassHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function getClassHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { id: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const db = createDb(requireD1(env));
	const classRow = await findClassById(db, params.id);
	if (!classRow) {
		return json({ error: "Turma não encontrada" }, 404);
	}
	return json(classRow, 200);
}

export async function updateClassHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { id: string };
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
	const mapped = Object.fromEntries(
		Object.entries(mapClassRequestToRow(body)).filter(
			([, value]) => value !== undefined,
		),
	);
	const parsed = updateClassSchema.safeParse(mapped);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const classRow = await findClassById(db, params.id);
	if (!classRow) {
		return json({ error: "Turma não encontrada" }, 404);
	}

	const updated = await updateClass(db, params.id, parsed.data);
	return json(updated, 200);
}
