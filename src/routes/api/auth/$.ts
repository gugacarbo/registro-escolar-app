import { createFileRoute } from "@tanstack/react-router";
import { createAuth } from "#/lib/auth";
import { getRuntimeEnv, requireD1 } from "#/lib/cloudflare-env";
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

async function authHandler({
	request,
	context,
}: {
	request: Request;
	context: { env?: Env };
}) {
	const env = context.env ?? (await getRuntimeEnv());
	const db = requireD1(env);
	if (!env) {
		throw new Error("D1 binding not available");
	}
	const auth = createAuth(db, env);
	return auth.handler(request);
}
