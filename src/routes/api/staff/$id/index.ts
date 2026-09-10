import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	findStaffById,
	softDeleteStaff,
	updateStaff,
} from "#/lib/staff/repository";
import { updateStaffSchema } from "#/lib/staff/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/staff/$id/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: getStaffHandler,
			PATCH: updateStaffHandler,
			DELETE: deleteStaffHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function getStaffHandler({
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
	const staff = await findStaffById(db, params.id);
	if (!staff || staff.deletedAt) {
		return json({ error: "Servidor não encontrado" }, 404);
	}
	return json(staff, 200);
}

export async function updateStaffHandler({
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

	const body = (await request.json()) as Record<string, unknown>;
	const parsed = updateStaffSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}

	const db = createDb(requireD1(env));
	const staff = await findStaffById(db, params.id);
	if (!staff || staff.deletedAt) {
		return json({ error: "Servidor não encontrado" }, 404);
	}

	const updated = await updateStaff(db, params.id, parsed.data);
	return json(updated, 200);
}

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
