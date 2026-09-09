import { createAuth } from "@/lib/auth";
import { getRuntimeEnv, requireD1 } from "@/lib/cloudflare-env";

export async function getSession(request: Request, env?: Env) {
	const resolvedEnv = env ?? (await getRuntimeEnv());
	if (!resolvedEnv) {
		throw new Error("D1 binding not available");
	}
	const db = requireD1(resolvedEnv);
	const auth = createAuth(db, resolvedEnv);
	const session = await auth.api.getSession({ headers: request.headers });
	return session;
}
