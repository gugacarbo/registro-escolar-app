import { createAuthClient } from "better-auth/react";

const baseURL =
	typeof import.meta.env !== "undefined"
		? (import.meta.env.VITE_BETTER_AUTH_URL as string | undefined)
		: undefined;

export const authClient = createAuthClient({
	baseURL: baseURL ?? "/api/auth",
});
