import { getSession } from "#/lib/auth/session";

export type AdminSession = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export type AdminAuthorization =
	| { session: AdminSession; response: null }
	| { session: null; response: Response };

function json(body: unknown, status: number) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

export async function requireAdminSession(
	request: Request,
	env: Env | undefined,
): Promise<AdminAuthorization> {
	const session = await getSession(request, env);
	if (!session?.user) {
		return {
			session: null,
			response: json({ error: "Não autenticado" }, 401),
		};
	}
	if (session.user.role !== "admin") {
		return {
			session: null,
			response: json({ error: "Acesso negado" }, 403),
		};
	}
	return { session, response: null };
}
