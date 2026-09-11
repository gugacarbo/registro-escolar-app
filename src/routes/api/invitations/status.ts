import { createFileRoute } from "@tanstack/react-router";

import { createDb } from "#/db";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
import { hasPermanentAdmin } from "#/lib/invitations/repository";
import { d1Middleware } from "#/middleware/d1";

export const Route = createFileRoute("/api/invitations/status")({
	server: {
		middleware: [d1Middleware],
		handlers: {
			GET: registrationStatusHandler,
		},
	},
});

export async function registrationStatusHandler({
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const db = createDb(requireD1(env));
	const adminExists = await hasPermanentAdmin(db);

	return new Response(
		JSON.stringify({
			open: !adminExists,
			isInitialSetup: !adminExists,
			requiresInvite: adminExists,
		}),
		{
			status: 200,
			headers: { "Content-Type": "application/json" },
		},
	);
}
