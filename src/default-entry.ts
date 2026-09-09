import "@tanstack/react-router";
import {
	createStartHandler,
	defaultStreamHandler,
} from "@tanstack/react-start/server";

type CloudflareContext = {
	env: Env;
	ctx: ExecutionContext;
};

declare module "@tanstack/react-router" {
	interface Register {
		server: {
			requestContext: CloudflareContext;
		};
	}
}

const handler = createStartHandler(defaultStreamHandler);

export default {
	async fetch(
		request: Request,
		opts: { context: CloudflareContext },
	): Promise<Response> {
		return handler(request, opts as unknown as Parameters<typeof handler>[1]);
	},
};
