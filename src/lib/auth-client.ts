import { createAuthClient } from "better-auth/react";

const baseURL =
	typeof import.meta.env !== "undefined"
		? (import.meta.env.BETTER_AUTH_URL as string | undefined)
		: undefined;

// No SSR não há window.location e o better-auth exige URL absoluta —
// omitir baseURL faz o cliente deduzir a origem do window.location no browser.
export const authClient = createAuthClient({
	...(baseURL ? { baseURL } : {}),
	user: {
		additionalFields: {
			role: { type: "string" },
			isPermanentAdmin: { type: "boolean" },
		},
	},
});

export type SessionUser = typeof authClient.$Infer.Session.user;
