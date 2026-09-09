import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { findStaffById, softDeleteStaff } from "#/lib/staff/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/staff/$id/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			DELETE: deleteStaffHandler,
		},
	},
});

export async function deleteStaffHandler({
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
		return new Response(JSON.stringify({ error: "Não autenticado" }), {
			status: 401,
			headers: { "Content-Type": "application/json" },
		});
	}

	const db = createDb(requireD1(env));
	const staff = await findStaffById(db, params.id);
	if (!staff || staff.deletedAt) {
		return new Response(JSON.stringify({ error: "Servidor não encontrado" }), {
			status: 404,
			headers: { "Content-Type": "application/json" },
		});
	}

	const deleted = await softDeleteStaff(db, params.id);
	return new Response(JSON.stringify(deleted), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}
