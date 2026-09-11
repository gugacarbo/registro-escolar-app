import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { ERR_TEMPLATE_NOT_FOUND } from "#/lib/minutes/errors";
import {
	findMinuteTemplateById,
	updateMinuteTemplate,
} from "#/lib/minutes/repository";
import { updateMinuteTemplateSchema } from "#/lib/minutes/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/minute-templates/$id/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: getMinuteTemplateHandler,
			PATCH: updateMinuteTemplateHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

type Ctx = {
	request: Request;
	context: { env?: Env };
	params: { id: string };
};

export async function getMinuteTemplateHandler({
	request,
	context,
	params,
}: Ctx) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const db = createDb(requireD1(env));
	const template = await findMinuteTemplateById(db, params.id);
	if (!template) {
		return json({ error: ERR_TEMPLATE_NOT_FOUND }, 404);
	}
	return json(template, 200);
}

export async function updateMinuteTemplateHandler({
	request,
	context,
	params,
}: Ctx) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}

	const body = await request.json().catch(() => null);
	const parsed = updateMinuteTemplateSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const template = await findMinuteTemplateById(db, params.id);
	if (!template) {
		return json({ error: ERR_TEMPLATE_NOT_FOUND }, 404);
	}

	return json(await updateMinuteTemplate(db, params.id, parsed.data), 200);
}
