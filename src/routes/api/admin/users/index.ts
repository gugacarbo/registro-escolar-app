import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { requireAdminSession } from "#/lib/admin-users/authorization";
import { countUsers, listUsers } from "#/lib/admin-users/repository";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { parsePageParams } from "#/lib/pagination";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/admin/users/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listAdminUsersHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function listAdminUsersHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const { session, response } = await requireAdminSession(request, env);
	if (!session) {
		return response;
	}

	const url = new URL(request.url);
	const { page, pageSize, limit, offset, search } = parsePageParams(
		url.searchParams,
	);

	const db = createDb(requireD1(env));
	const [users, total] = await Promise.all([
		listUsers(db, { search, limit, offset }),
		countUsers(db, { search }),
	]);
	return json({ data: users, total, page, pageSize }, 200);
}
