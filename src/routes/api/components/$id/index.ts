import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	findComponentById,
	updateComponent,
} from "#/lib/components/repository";
import { updateComponentSchema } from "#/lib/components/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/components/$id/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: getComponentHandler,
			PATCH: updateComponentHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function getComponentHandler({
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
	const component = await findComponentById(db, params.id);
	if (!component) {
		return json({ error: "Componente não encontrado" }, 404);
	}
	return json(component, 200);
}

export async function updateComponentHandler({
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

	const body = await request.json().catch(() => null);
	if (!body) {
		return json({ error: "Dados inválidos" }, 400);
	}
	const parsed = updateComponentSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const component = await findComponentById(db, params.id);
	if (!component) {
		return json({ error: "Componente não encontrado" }, 404);
	}

	const updated = await updateComponent(db, params.id, parsed.data);
	return json(updated, 200);
}
