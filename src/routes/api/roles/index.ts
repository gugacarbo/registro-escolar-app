import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { parsePageParams } from "#/lib/pagination";
import {
	countRoles,
	createRole,
	ensureDefaultRoles,
	findRoleByNormalizedName,
	listRoles,
} from "#/lib/roles/repository";
import { createRoleSchema } from "#/lib/roles/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/roles/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listRolesHandler,
			POST: createRoleHandler,
		},
	},
});

export async function listRolesHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return new Response(JSON.stringify({ error: "Não autenticado" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const url = new URL(request.url);
	const { page, pageSize, limit, offset, search } = parsePageParams(
		url.searchParams,
	);

	const db = createDb(requireD1(env));
	await ensureDefaultRoles(db);
	const [roles, total] = await Promise.all([
		listRoles(db, { search, limit, offset }),
		countRoles(db, { search }),
	]);
	return new Response(JSON.stringify({ data: roles, total, page, pageSize }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

export async function createRoleHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const session = await getSession(request, env);
	if (!session) {
		return new Response(JSON.stringify({ error: "Não autenticado" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const body = await request.json();
	const parsed = createRoleSchema.safeParse(body);
	if (!parsed.success) {
		return new Response(
			JSON.stringify({ error: "Dados inválidos", issues: parsed.error.issues }),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	const db = createDb(requireD1(env));
	await ensureDefaultRoles(db);
	const existingRole = await findRoleByNormalizedName(db, parsed.data.name);

	if (existingRole) {
		return new Response(
			JSON.stringify({ error: "Papel já existe", existingRole }),
			{
				status: 409,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	const role = await createRole(db, parsed.data);
	return new Response(JSON.stringify(role), {
		status: 201,
		headers: { "Content-Type": "application/json" },
	});
}
