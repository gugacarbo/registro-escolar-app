import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getSession } from "#/lib/auth/session";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import {
	countPendingInvitationsByUser,
	createInvitation,
	listInvitationsByUser,
	MAX_PENDING_INVITATIONS,
} from "#/lib/invitations/repository";
import { createInvitationSchema } from "#/lib/invitations/schema";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/invitations/")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: listInvitationsHandler,
			POST: createInvitationHandler,
		},
	},
});

export async function listInvitationsHandler({
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

	const db = createDb(requireD1(env));
	const [invitations, pendingCount] = await Promise.all([
		listInvitationsByUser(db, session.user.id),
		countPendingInvitationsByUser(db, session.user.id),
	]);

	return new Response(
		JSON.stringify({
			data: invitations,
			pendingCount,
			maxPending: MAX_PENDING_INVITATIONS,
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		},
	);
}

export async function createInvitationHandler({
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

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: "JSON inválido" }), {
			status: 400,
			headers: { "Content-Type": "application/json" },
		});
	}

	const parsed = createInvitationSchema.safeParse(body);
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
	try {
		const newInv = await createInvitation(db, {
			email: parsed.data.email,
			invitedById: session.user.id,
			inviterName: session.user.name || session.user.email,
			appBaseURL: env?.BETTER_AUTH_URL,
			resendApiKey: env?.RESEND_API_KEY,
			resendFrom: env?.EMAIL_FROM,
		});

		return new Response(JSON.stringify(newInv), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (err: unknown) {
		const message =
			err instanceof Error ? err.message : "Erro ao criar convite";
		const status = message.includes("já possui uma conta")
			? 409
			: message.includes("Limite")
				? 400
				: 500;

		return new Response(JSON.stringify({ error: message }), {
			status,
			headers: { "Content-Type": "application/json" },
		});
	}
}
