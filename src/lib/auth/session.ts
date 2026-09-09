import { createAuth } from "@/lib/auth";

export async function getSession(request: Request, env: Env) {
	const db = env.DB;
	if (!(db instanceof D1Database)) {
		throw new Error("D1 binding not available");
	}
	const auth = createAuth(db, env);
	const session = await auth.api.getSession({ headers: request.headers });
	return session;
}
