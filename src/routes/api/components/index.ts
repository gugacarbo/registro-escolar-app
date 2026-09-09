import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	countComponents,
	createComponent,
	findComponentByNormalizedName,
	listComponents,
} from "#/lib/components/repository";
import { createComponentSchema } from "#/lib/components/schema";
import { parsePageParams } from "#/lib/pagination";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/components/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listComponentsHandler,
			POST: createComponentHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function listComponentsHandler({
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
	const [components, total] = await Promise.all([
		listComponents(db, { search, limit, offset }),
		countComponents(db, { search }),
	]);
	return json({ data: components, total, page, pageSize }, 200);
}

export async function createComponentHandler({
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

	const body = await request.json();
	const parsed = createComponentSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));

	// Borda 1 (spec 0004): componente com nome duplicado (normalizado) → 409.
	const existing = await findComponentByNormalizedName(db, parsed.data.name);
	if (existing) {
		return json(
			{ error: "Componente já existe", existingComponent: existing },
			409,
		);
	}

	const component = await createComponent(db, parsed.data);
	return json(component, 201);
}
