import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { getStudentHistory } from "#/lib/history/repository";
import { parseHistoryQuery } from "#/lib/history/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/students/$id/history")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: getStudentHistoryHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function getStudentHistoryHandler({
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

	let query;
	try {
		query = parseHistoryQuery(new URL(request.url));
	} catch {
		return json({ error: "Parâmetros de busca inválidos" }, 400);
	}

	const db = createDb(requireD1(env));
	const result = await getStudentHistory(db, params.id, query);
	if (!result) {
		return json({ error: "Estudante não encontrado" }, 404);
	}
	return json(result, 200);
}
