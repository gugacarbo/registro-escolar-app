import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import {
	countClasses,
	createClass,
	listClasses,
} from "#/lib/classes/repository";
import { createClassSchema } from "#/lib/classes/schema";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { mapClassRequestToRow } from "#/lib/enrollments/mapping";
import { parsePageParams } from "#/lib/pagination";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/classes/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listClassesHandler,
			POST: createClassHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function listClassesHandler({
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

	const db = createDb(requireD1(env));
	const [classes, total] = await Promise.all([
		listClasses(db, { search, limit, offset }),
		countClasses(db, { search }),
	]);
	return json({ data: classes, total, page, pageSize }, 200);
}

export async function createClassHandler({
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
	const parsed = createClassSchema.safeParse(mapClassRequestToRow(body));
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const created = await createClass(db, parsed.data);
	return json(created, 201);
}
