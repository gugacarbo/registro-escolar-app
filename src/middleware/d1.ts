import { createMiddleware } from "@tanstack/react-start";

import { getRuntimeEnv } from "#/lib/cloudflare-env";

export const d1Middleware = createMiddleware({
	type: "request",
}).server(async ({ next, context }) => {
	// `context` pode não trazer o env (ex.: dev via vite plugin); o handler
	// resolve o restante via `cloudflare:workers`. Aqui só carrega o que já
	// existe para não quebrar o encadeamento do middleware.
	const env = await getRuntimeEnv(context);
	return next({
		context: {
			env,
		},
	});
});
