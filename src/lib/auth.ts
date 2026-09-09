import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { createDb } from "#/db";

const LOCAL_ORIGINS = ["http://localhost:3001", "http://127.0.0.1:3001"];

function resolveTrustedOrigins(env: Env): string[] {
	const baseURL = env.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL;
	const extra = (
		env.BETTER_AUTH_TRUSTED_ORIGINS ??
		process.env.BETTER_AUTH_TRUSTED_ORIGINS ??
		""
	)
		.split(",")
		.map((origin) => origin.trim())
		.filter(Boolean);
	return [...new Set([baseURL, ...extra, ...LOCAL_ORIGINS].filter(Boolean))];
}

export function createAuth(d1: D1Database, env: Env) {
	const db = createDb(d1);

	return betterAuth({
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL ?? process.env.BETTER_AUTH_URL,
		trustedOrigins: resolveTrustedOrigins(env),
		database: drizzleAdapter(db, {
			provider: "sqlite",
		}),
		emailAndPassword: {
			enabled: true,
		},
		plugins: [tanstackStartCookies()],
	});
}
