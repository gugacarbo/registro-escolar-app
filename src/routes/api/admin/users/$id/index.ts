import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { requireAdminSession } from "#/lib/admin-users/authorization";
import {
	deleteUserWithCascade,
	findUserById,
	updateUserRole,
} from "#/lib/admin-users/repository";
import { updateRoleSchema } from "#/lib/admin-users/schema";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/admin/users/$id/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			PATCH: updateUserRoleHandler,
			DELETE: deleteUserHandler,
		},
	},
});

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function updateUserRoleHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { id: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const { session, response } = await requireAdminSession(request, env);
	if (!session) {
		return response;
	}

	const body = (await request.json().catch(() => null)) as Record<
		string,
		unknown
	> | null;
	const parsed = updateRoleSchema.safeParse(body);
	if (!parsed.success) {
		return json({ error: "Dados inválidos", issues: parsed.error.issues }, 400);
	}
	if (parsed.data.role === undefined) {
		return json({ error: "Dados inválidos" }, 400);
	}

	const db = createDb(requireD1(env));
	const target = await findUserById(db, params.id);
	if (!target) {
		return json({ error: "Usuário não encontrado" }, 404);
	}
	if (target.id === session.user.id) {
		return json({ error: "Você não pode alterar a própria conta" }, 403);
	}
	if (target.isPermanentAdmin) {
		return json(
			{ error: "O administrador permanente não pode ser alterado" },
			403,
		);
	}

	const updated = await updateUserRole(db, params.id, parsed.data.role);
	return json(updated, 200);
}

export async function deleteUserHandler({
	request,
	context,
	params,
}: {
	request: Request;
	context: { env?: Env };
	params: { id: string };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const { session, response } = await requireAdminSession(request, env);
	if (!session) {
		return response;
	}

	const db = createDb(requireD1(env));
	const target = await findUserById(db, params.id);
	if (!target) {
		return json({ error: "Usuário não encontrado" }, 404);
	}
	if (target.id === session.user.id) {
		return json({ error: "Você não pode excluir a própria conta" }, 403);
	}
	if (target.isPermanentAdmin) {
		return json(
			{ error: "O administrador permanente não pode ser excluído" },
			403,
		);
	}
	if (target.role === "admin") {
		return json({ error: "Somente usuários comuns podem ser excluídos" }, 403);
	}

	await deleteUserWithCascade(db, params.id);
	return json(target, 200);
}
