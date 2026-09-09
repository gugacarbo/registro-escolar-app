import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { ERR_TEMPLATE_NAME_REQUIRED } from "#/lib/minutes/errors";
import {
	createMinuteTemplate,
	listMinuteTemplates,
} from "#/lib/minutes/repository";
import { createMinuteTemplateSchema } from "#/lib/minutes/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/minute-templates/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listHandler,
			POST: createHandler,
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
};

export async function listHandler({ request, context }: Ctx) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}
	const db = createDb(requireD1(env));
	return json(await listMinuteTemplates(db), 200);
}

export async function createHandler({ request, context }: Ctx) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return json({ error: "Não autenticado" }, 401);
	}
	const body = (await request.json().catch(() => null)) as unknown;
	const parsed = createMinuteTemplateSchema.safeParse(body ?? {});
	if (!parsed.success) {
		return json(
			{ error: ERR_TEMPLATE_NAME_REQUIRED, issues: parsed.error.issues },
			400,
		);
	}
	const db = createDb(requireD1(env));
	const template = await createMinuteTemplate(db, parsed.data);
	return json(template, 201);
}
