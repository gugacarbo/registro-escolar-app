import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { createAuth } from "#/lib/auth";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	hasPermanentAdmin,
	markInvitationAccepted,
	validateInviteForRegistration,
} from "#/lib/invitations/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: authHandler,
			POST: authHandler,
			PUT: authHandler,
			PATCH: authHandler,
			DELETE: authHandler,
		},
	},
});

export async function authHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const d1 = requireD1(env);
	if (!env) {
		return new Response(
			JSON.stringify({ message: "D1 binding not available" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	const url = new URL(request.url);
	const isSignUpEmail =
		request.method === "POST" && url.pathname.endsWith("/sign-up/email");

	if (isSignUpEmail) {
		const db = createDb(d1);
		const adminExists = await hasPermanentAdmin(db);

		if (adminExists) {
			let inviteToken: string | null | undefined =
				request.headers.get("x-invite-token") ||
				url.searchParams.get("token") ||
				url.searchParams.get("inviteToken");

			let userEmail: string | undefined;
			try {
				const body = (await request.clone().json()) as {
					email?: string;
					token?: string;
					inviteToken?: string;
				};
				if (!inviteToken && body) {
					inviteToken = body.token || body.inviteToken;
				}
				userEmail = body?.email;
			} catch {
				// Segue com validação dos parâmetros obtidos
			}

			if (!inviteToken) {
				return new Response(
					JSON.stringify({
						message:
							"Cadastro livre desabilitado. É necessário um convite válido para se cadastrar.",
						code: "INVITE_REQUIRED",
					}),
					{
						status: 403,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			if (!userEmail) {
				return new Response(
					JSON.stringify({
						message: "Email obrigatório para cadastro.",
						code: "INVALID_EMAIL",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			const validation = await validateInviteForRegistration(
				db,
				inviteToken,
				userEmail,
			);
			if (!validation.valid) {
				return new Response(
					JSON.stringify({
						message: validation.error,
						code: "INVALID_INVITATION",
					}),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			const auth = createAuth(d1, env);
			const response = await auth.handler(request);

			if (response.ok) {
				try {
					await markInvitationAccepted(db, inviteToken);
				} catch (error) {
					console.error("Falha ao marcar convite como aceito:", error);
				}
			}

			return response;
		}
	}

	const auth = createAuth(d1, env);
	return auth.handler(request);
}
