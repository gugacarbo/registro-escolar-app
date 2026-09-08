import { createFileRoute } from "@tanstack/react-router";
import { getRequestEvent } from "@tanstack/react-start/server";
import { createAuth } from "#/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: ({ request }) => {
				const event = getRequestEvent();
				const auth = createAuth(event?.cloudflare.env.DB as D1Database);
				return auth.handler(request);
			},
			POST: ({ request }) => {
				const event = getRequestEvent();
				const auth = createAuth(event?.cloudflare.env.DB as D1Database);
				return auth.handler(request);
			},
		},
	},
});
