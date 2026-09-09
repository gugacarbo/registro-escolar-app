import { createMiddleware } from "@tanstack/react-start";

type CloudflareEnv = {
	env: Env;
	ctx: ExecutionContext;
};

export const d1Middleware = createMiddleware({
	type: "request",
}).server(async ({ next, context }) => {
	const cloudflare = context as unknown as CloudflareEnv;
	return next({
		context: {
			env: cloudflare.env,
			executionContext: cloudflare.ctx,
		},
	});
});
