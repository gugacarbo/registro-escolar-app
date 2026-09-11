import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { findInvitationByToken } from "#/lib/invitations/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/invitations/verify")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: verifyInvitationHandler,
		},
	},
});

export async function verifyInvitationHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const url = new URL(request.url);
	const token = url.searchParams.get("token");

	if (!token) {
		return new Response(
			JSON.stringify({ valid: false, error: "Token não fornecido." }),
			{
				status: 400,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	const db = createDb(requireD1(env));
	const inv = await findInvitationByToken(db, token);

	if (!inv) {
		return new Response(
			JSON.stringify({ valid: false, error: "Convite não encontrado." }),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	if (inv.status !== "pending") {
		const message =
			inv.status === "accepted"
				? "Este convite já foi utilizado."
				: inv.status === "expired"
					? "Este convite expirou (validade de 7 dias)."
					: "Este convite foi cancelado.";

		return new Response(JSON.stringify({ valid: false, error: message }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	}

	if (inv.expiresAt.getTime() <= Date.now()) {
		return new Response(
			JSON.stringify({
				valid: false,
				error: "Este convite expirou (validade de 7 dias).",
			}),
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	return new Response(
		JSON.stringify({
			valid: true,
			email: inv.email,
			expiresAt: inv.expiresAt,
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		},
	);
}
