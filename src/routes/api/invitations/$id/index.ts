import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { revokeInvitation } from "#/lib/invitations/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/invitations/$id/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			DELETE: revokeInvitationHandler,
		},
	},
});

export async function revokeInvitationHandler({
	request,
	params,
	context,
}: {
	request: Request;
	params: { id: string };
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

	const db = createDb(requireD1(env));
	try {
		const revoked = await revokeInvitation(db, params.id, session.user.id);
		return new Response(JSON.stringify(revoked), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err: unknown) {
		const message =
			err instanceof Error ? err.message : "Erro ao revogar convite";
		const status = message.includes("não encontrado") ? 404 : 400;
		return new Response(JSON.stringify({ error: message }), {
			status,
			headers: { "Content-Type": "application/json" },
		});
	}
}
